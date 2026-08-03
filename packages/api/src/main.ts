import "dotenv/config";
import { createContainer } from "./app/container.js";
import { Scheduler } from "./app/scheduler.js";
import { registerGracefulShutdown } from "./app/shutdown.js";
import { buildServer } from "./infrastructure/http/index.js";

async function main(): Promise<void> {
  const container = createContainer();

  const app = buildServer({
    getLatestRate: container.useCases.getLatestRate,
    getRateByDate: container.useCases.getRateByDate,
    scrapeAllTargets: container.useCases.scrapeAllTargets,
    targets: container.targets,
    checkDatabaseHealth: () => container.checkDatabaseHealth(),
    apiKeys: container.env.API_KEYS,
    rateLimitMax: container.env.RATE_LIMIT_MAX,
    nodeEnv: container.env.NODE_ENV,
  });

  // This deployment's image has no Chromium installed (see Dockerfile) — an
  // active 'spa' target would fail every time it's scraped (ScrapeAllTargets
  // catches that per-target and keeps going, so it's not a crash), but
  // surfacing it once at startup is far easier to notice than digging it out
  // of scrape failure logs later.
  const unsupportedSpaTargets = container.targets.filter(
    (target) => target.active && target.type === "spa",
  );
  if (unsupportedSpaTargets.length > 0) {
    app.log.warn(
      `${unsupportedSpaTargets.length} active 'spa' target(s) configured (${unsupportedSpaTargets
        .map((target) => target.sourceName)
        .join(
          ", ",
        )}) but this image has no Chromium installed — scraping them will fail until Playwright/Chromium is added to the Dockerfile.`,
    );
  }

  const scheduler = new Scheduler({
    cronExpression: container.env.CRON_EXPRESSION,
    scrapeAllTargets: container.useCases.scrapeAllTargets,
    targets: container.targets,
    logger: app.log,
  });

  if (container.env.CRON_ENABLED) {
    scheduler.start();
  } else {
    app.log.info(
      "CRON_ENABLED=false — internal scheduler not started; expecting an external trigger for POST /v1/scrape.",
    );
  }

  registerGracefulShutdown({ scheduler, container, logger: app.log });

  await app.listen({ port: container.env.PORT, host: "0.0.0.0" });
}

main().catch((error: unknown) => {
  console.error("Fatal error starting the server:", error);
  process.exitCode = 1;
});
