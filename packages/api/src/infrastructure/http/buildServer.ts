import { randomUUID } from "node:crypto";
import helmet from "@fastify/helmet";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { GetLatestRate, GetRateByDate, ScrapeAllTargets, ScrapeTarget } from "@ratio/core";
import Fastify from "fastify";
import { registerApiKeyAuth } from "./apiKeyAuth.js";
import { registerErrorHandler } from "./errorHandler.js";
import { registerHealthRoute } from "./healthRoute.js";
import { registerRateLimit } from "./rateLimit.js";
import { registerRatesRoutes } from "./ratesRoutes.js";
import { registerScrapeRoute } from "./scrapeRoute.js";

export type NodeEnv = "development" | "test" | "production";

export interface BuildServerDeps {
  readonly getLatestRate: Pick<GetLatestRate, "execute">;
  readonly getRateByDate: Pick<GetRateByDate, "execute">;
  readonly scrapeAllTargets: Pick<ScrapeAllTargets, "execute">;
  readonly targets: readonly ScrapeTarget[];
  readonly checkDatabaseHealth: () => Promise<boolean>;
  /**
   * Valid API keys for POST /v1/scrape — the only protected route. GET
   * /v1/rates/* is public (this API isn't metered or rate-limited per
   * consumer beyond the shared IP-based rate limit; there's nothing to
   * protect reads from). Defaults to none, i.e. /v1/scrape rejects every request.
   */
  readonly apiKeys?: readonly string[];
  /** Requests allowed per minute, keyed by API key (or IP). Defaults to 100. */
  readonly rateLimitMax?: number;
  readonly nodeEnv?: NodeEnv;
}

export type ServerInstance = ReturnType<typeof createFastifyInstance>;

function resolveLogLevel(nodeEnv: NodeEnv | undefined): string {
  switch (nodeEnv) {
    case "production":
      return "info";
    case "test":
      return "silent";
    default:
      return "debug";
  }
}

function createFastifyInstance(nodeEnv: NodeEnv | undefined) {
  return Fastify({
    logger: {
      level: resolveLogLevel(nodeEnv),
      redact: ['req.headers["x-api-key"]'],
    },
    genReqId: () => randomUUID(),
  }).withTypeProvider<TypeBoxTypeProvider>();
}

/**
 * Builds a fully configured Fastify instance with no global state, so tests
 * can use fastify.inject() against a freshly built instance without binding
 * a real port.
 */
export function buildServer(deps: BuildServerDeps): ServerInstance {
  const app = createFastifyInstance(deps.nodeEnv);

  // contentSecurityPolicy is HTML-oriented (this is a JSON-only API with no
  // rendered pages); the rest of helmet's defaults (HSTS, X-Content-Type-Options,
  // X-Frame-Options, etc.) still apply to every response, including errors.
  app.register(helmet, { contentSecurityPolicy: false });
  registerErrorHandler(app);
  registerRateLimit(app, deps.rateLimitMax !== undefined ? { max: deps.rateLimitMax } : {});

  // Registered as plugins (not plain app.get calls) so they boot after the
  // rate-limit plugin above: @fastify/rate-limit attaches itself to routes
  // via an onRoute hook, which only fires for routes registered afterwards.
  app.register(async (healthScope) => {
    registerHealthRoute(healthScope, deps);
  });

  // Public: no auth. This is what the SDK actually calls — free, unmetered
  // reads, no API key required.
  app.register(async (ratesScope) => {
    registerRatesRoutes(ratesScope, deps);
  });

  // Protected: POST /v1/scrape triggers real work (requests to the scraped
  // sites, writes against a free-tier Postgres) — only the scheduled trigger
  // (see .github/workflows/scrape.yml) should be able to call this.
  app.register(async (scrapeScope) => {
    registerApiKeyAuth(scrapeScope, { apiKeys: deps.apiKeys ?? [] });
    registerScrapeRoute(scrapeScope, deps);
  });

  return app;
}
