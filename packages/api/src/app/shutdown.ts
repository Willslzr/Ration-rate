import type { Logger } from "../infrastructure/logging/Logger.js";
import { consoleLogger } from "../infrastructure/logging/Logger.js";
import type { Scheduler } from "./scheduler.js";

export interface DisposableContainer {
  dispose(): Promise<void>;
}

export interface GracefulShutdownDeps {
  readonly scheduler: Pick<Scheduler, "stop">;
  readonly container: DisposableContainer;
  readonly logger?: Logger;
  readonly exit?: (code: number) => void;
}

const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"] as const;

/**
 * Registers SIGINT/SIGTERM handlers that stop the cron scheduler and dispose
 * the container — closing Playwright's browser and disconnecting Prisma —
 * before exiting. Returns a function that unregisters the handlers.
 */
export function registerGracefulShutdown(deps: GracefulShutdownDeps): () => void {
  const logger = deps.logger ?? consoleLogger;
  const exit = deps.exit ?? ((code: number) => process.exit(code));

  let shuttingDown = false;

  const handleSignal = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    logger.info(`Received ${signal}, shutting down gracefully...`);
    deps.scheduler.stop();
    deps.container
      .dispose()
      .then(() => {
        logger.info("Shutdown complete.");
        exit(0);
      })
      .catch((error: unknown) => {
        logger.warn(
          `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`,
        );
        exit(1);
      });
  };

  for (const signal of SHUTDOWN_SIGNALS) {
    process.on(signal, handleSignal);
  }

  return () => {
    for (const signal of SHUTDOWN_SIGNALS) {
      process.off(signal, handleSignal);
    }
  };
}
