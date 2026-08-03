import type { ScrapeSummary, ScrapeTarget } from "@ratio/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Logger } from "../infrastructure/logging/Logger.js";
import { Scheduler } from "./scheduler.js";
import type { ScrapeRunner } from "./scheduler.js";

function buildTarget(overrides: Partial<ScrapeTarget> = {}): ScrapeTarget {
  return {
    isoCode: "VES",
    sourceName: "bcv_oficial",
    url: "https://www.bcv.org.ve",
    type: "html",
    selector: "#dolar",
    active: true,
    ...overrides,
  };
}

function buildLogger(): Logger {
  return { info: vi.fn(), warn: vi.fn() };
}

describe("Scheduler.runOnce", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs the scrape with only the active targets and logs the summary", async () => {
    const summary: ScrapeSummary = { succeeded: ["bcv_oficial"], failed: [] };
    const execute = vi.fn().mockResolvedValue(summary);
    const runner: ScrapeRunner = { execute };
    const logger = buildLogger();
    const scheduler = new Scheduler({
      cronExpression: "0 * * * *",
      scrapeAllTargets: runner,
      targets: [
        buildTarget({ sourceName: "active", active: true }),
        buildTarget({ sourceName: "inactive", active: false }),
      ],
      logger,
    });

    await scheduler.runOnce();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith([expect.objectContaining({ sourceName: "active" })]);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("bcv_oficial"));
  });

  it("skips a new run and logs a warning when the previous run is still in progress", async () => {
    vi.useFakeTimers();

    const execute = vi.fn(
      () =>
        new Promise<ScrapeSummary>((resolve) => {
          setTimeout(() => resolve({ succeeded: [], failed: [] }), 10_000);
        }),
    );
    const runner: ScrapeRunner = { execute };
    const logger = buildLogger();
    const scheduler = new Scheduler({
      cronExpression: "0 * * * *",
      scrapeAllTargets: runner,
      targets: [buildTarget()],
      logger,
    });

    const first = scheduler.runOnce();
    const second = scheduler.runOnce();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("skipping"));

    await vi.advanceTimersByTimeAsync(10_000);
    await first;
    await second;
  });

  it("accepts a new run once the previous one has finished", async () => {
    vi.useFakeTimers();

    const execute = vi.fn(
      () =>
        new Promise<ScrapeSummary>((resolve) => {
          setTimeout(() => resolve({ succeeded: [], failed: [] }), 1000);
        }),
    );
    const runner: ScrapeRunner = { execute };
    const scheduler = new Scheduler({
      cronExpression: "0 * * * *",
      scrapeAllTargets: runner,
      targets: [buildTarget()],
      logger: buildLogger(),
    });

    const first = scheduler.runOnce();
    await vi.advanceTimersByTimeAsync(1000);
    await first;

    const second = scheduler.runOnce();
    await vi.advanceTimersByTimeAsync(1000);
    await second;

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("clears the running flag even if the scrape run throws", async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ succeeded: [], failed: [] });
    const runner: ScrapeRunner = { execute };
    const scheduler = new Scheduler({
      cronExpression: "0 * * * *",
      scrapeAllTargets: runner,
      targets: [buildTarget()],
      logger: buildLogger(),
    });

    await expect(scheduler.runOnce()).rejects.toThrow("boom");
    await expect(scheduler.runOnce()).resolves.toBeUndefined();

    expect(execute).toHaveBeenCalledTimes(2);
  });
});
