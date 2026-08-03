import type { ScrapeAllTargets, ScrapeTarget } from "@ratio/core";
import type { ServerInstance } from "./buildServer.js";
import { ScrapeInProgressError } from "./httpErrors.js";
import { ScrapeSummarySchema } from "./schemas.js";

export interface ScrapeRouteDeps {
  readonly scrapeAllTargets: Pick<ScrapeAllTargets, "execute">;
  readonly targets: readonly ScrapeTarget[];
}

/**
 * On-demand trigger for the scraping pipeline. The production deployment
 * (Render free tier) sleeps the process after 15 minutes idle, which makes
 * the in-process node-cron scheduler unreliable — an external scheduler
 * (GitHub Actions, see .github/workflows/scrape.yml) calls this instead.
 * Guarded so two concurrent calls never scrape at the same time.
 */
export function registerScrapeRoute(app: ServerInstance, deps: ScrapeRouteDeps): void {
  let running = false;

  app.post(
    "/v1/scrape",
    { schema: { response: { 200: ScrapeSummarySchema, 207: ScrapeSummarySchema } } },
    async (_request, reply) => {
      if (running) {
        throw new ScrapeInProgressError("A scrape is already in progress.");
      }

      running = true;
      try {
        const activeTargets = deps.targets.filter((target) => target.active);
        const summary = await deps.scrapeAllTargets.execute(activeTargets);
        const status = summary.failed.length > 0 ? 207 : 200;
        return reply
          .code(status)
          .send({ succeeded: [...summary.succeeded], failed: [...summary.failed] });
      } finally {
        running = false;
      }
    },
  );
}
