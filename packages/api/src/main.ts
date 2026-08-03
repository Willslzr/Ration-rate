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
    checkDatabaseHealth: () => container.checkDatabaseHealth(),
    nodeEnv: container.env.NODE_ENV,
  });

  const scheduler = new Scheduler({
    cronExpression: container.env.CRON_EXPRESSION,
    scrapeAllTargets: container.useCases.scrapeAllTargets,
    targets: container.targets,
    logger: app.log,
  });
  scheduler.start();

  registerGracefulShutdown({ scheduler, container, logger: app.log });

  await app.listen({ port: container.env.PORT, host: "0.0.0.0" });
}

main().catch((error: unknown) => {
  console.error("Fatal error starting the server:", error);
  process.exitCode = 1;
});
