import { randomUUID } from "node:crypto";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { GetLatestRate, GetRateByDate } from "@ratio/core";
import Fastify from "fastify";
import { registerApiKeyAuth } from "./apiKeyAuth.js";
import { registerErrorHandler } from "./errorHandler.js";
import { registerHealthRoute } from "./healthRoute.js";
import { registerRatesRoutes } from "./ratesRoutes.js";

export type NodeEnv = "development" | "test" | "production";

export interface BuildServerDeps {
  readonly getLatestRate: Pick<GetLatestRate, "execute">;
  readonly getRateByDate: Pick<GetRateByDate, "execute">;
  readonly checkDatabaseHealth: () => Promise<boolean>;
  /** Valid API keys for /v1/rates/*. Defaults to none, i.e. those routes reject every request. */
  readonly apiKeys?: readonly string[];
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

  registerErrorHandler(app);
  registerHealthRoute(app, deps);

  app.register(async (ratesScope) => {
    registerApiKeyAuth(ratesScope, { apiKeys: deps.apiKeys ?? [] });
    registerRatesRoutes(ratesScope, deps);
  });

  return app;
}
