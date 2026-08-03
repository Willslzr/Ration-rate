import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../infrastructure/logging/Logger.js";
import type { DisposableContainer } from "./shutdown.js";
import { registerGracefulShutdown } from "./shutdown.js";

function buildLogger(): Logger {
  return { info: vi.fn(), warn: vi.fn() };
}

describe("registerGracefulShutdown", () => {
  it("stops the scheduler and disposes the container on SIGINT", async () => {
    const scheduler = { stop: vi.fn() };
    const container: DisposableContainer = { dispose: vi.fn().mockResolvedValue(undefined) };
    const exit = vi.fn();
    const logger = buildLogger();

    const unregister = registerGracefulShutdown({ scheduler, container, logger, exit });
    try {
      process.emit("SIGINT");

      await vi.waitFor(() => {
        expect(container.dispose).toHaveBeenCalledTimes(1);
      });

      expect(scheduler.stop).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(0);
    } finally {
      unregister();
    }
  });

  it("stops the scheduler and disposes the container on SIGTERM", async () => {
    const scheduler = { stop: vi.fn() };
    const container: DisposableContainer = { dispose: vi.fn().mockResolvedValue(undefined) };
    const exit = vi.fn();

    const unregister = registerGracefulShutdown({
      scheduler,
      container,
      logger: buildLogger(),
      exit,
    });
    try {
      process.emit("SIGTERM");

      await vi.waitFor(() => {
        expect(exit).toHaveBeenCalledWith(0);
      });

      expect(scheduler.stop).toHaveBeenCalledTimes(1);
    } finally {
      unregister();
    }
  });

  it("exits with code 1 and logs a warning when disposal fails", async () => {
    const scheduler = { stop: vi.fn() };
    const container: DisposableContainer = {
      dispose: vi.fn().mockRejectedValue(new Error("disconnect failed")),
    };
    const exit = vi.fn();
    const logger = buildLogger();

    const unregister = registerGracefulShutdown({ scheduler, container, logger, exit });
    try {
      process.emit("SIGINT");

      await vi.waitFor(() => {
        expect(exit).toHaveBeenCalledWith(1);
      });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("disconnect failed"));
    } finally {
      unregister();
    }
  });

  it("ignores a second signal while already shutting down", async () => {
    const scheduler = { stop: vi.fn() };
    const container: DisposableContainer = { dispose: vi.fn().mockResolvedValue(undefined) };
    const exit = vi.fn();

    const unregister = registerGracefulShutdown({
      scheduler,
      container,
      logger: buildLogger(),
      exit,
    });
    try {
      process.emit("SIGINT");
      process.emit("SIGINT");

      await vi.waitFor(() => {
        expect(exit).toHaveBeenCalled();
      });

      expect(scheduler.stop).toHaveBeenCalledTimes(1);
      expect(container.dispose).toHaveBeenCalledTimes(1);
    } finally {
      unregister();
    }
  });

  it("unregister stops listening for signals", async () => {
    const scheduler = { stop: vi.fn() };
    const container: DisposableContainer = { dispose: vi.fn().mockResolvedValue(undefined) };
    const exit = vi.fn();

    const unregister = registerGracefulShutdown({
      scheduler,
      container,
      logger: buildLogger(),
      exit,
    });
    unregister();

    process.emit("SIGINT");
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(container.dispose).not.toHaveBeenCalled();
  });
});
