import type { ScrapeSummary, ScrapeTarget } from "@ratio/core";
import type { ScheduledTask } from "node-cron";
import { schedule } from "node-cron";
import type { Logger } from "../infrastructure/logging/Logger.js";
import { consoleLogger } from "../infrastructure/logging/Logger.js";

export interface ScrapeRunner {
  execute(targets: readonly ScrapeTarget[]): Promise<ScrapeSummary>;
}

export interface SchedulerOptions {
  readonly cronExpression: string;
  readonly scrapeAllTargets: ScrapeRunner;
  readonly targets: readonly ScrapeTarget[];
  readonly logger?: Logger;
}

/** Runs ScrapeAllTargets on a cron schedule, skipping a tick (with a warn log) if the previous run hasn't finished. */
export class Scheduler {
  private readonly cronExpression: string;
  private readonly scrapeAllTargets: ScrapeRunner;
  private readonly targets: readonly ScrapeTarget[];
  private readonly logger: Logger;
  private task: ScheduledTask | undefined;
  private running = false;

  constructor(options: SchedulerOptions) {
    this.cronExpression = options.cronExpression;
    this.scrapeAllTargets = options.scrapeAllTargets;
    this.targets = options.targets;
    this.logger = options.logger ?? consoleLogger;
  }

  start(): void {
    this.task ??= schedule(this.cronExpression, () => {
      void this.runOnce();
    });
  }

  stop(): void {
    this.task?.stop();
    this.task = undefined;
  }

  async runOnce(): Promise<void> {
    if (this.running) {
      this.logger.warn("Scheduler: previous scrape run is still in progress, skipping this tick.");
      return;
    }

    this.running = true;
    try {
      const activeTargets = this.targets.filter((target) => target.active);
      const summary = await this.scrapeAllTargets.execute(activeTargets);
      this.logger.info(
        `Scheduler: scrape run finished — succeeded: [${summary.succeeded.join(", ")}], failed: [${summary.failed.join(", ")}].`,
      );
    } finally {
      this.running = false;
    }
  }
}
