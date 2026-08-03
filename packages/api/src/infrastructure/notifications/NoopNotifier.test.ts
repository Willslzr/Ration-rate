import type { NotificationFailurePayload } from "@ratio/core";
import { describe, expect, it, vi } from "vitest";
import { NoopNotifier } from "./NoopNotifier.js";

describe("NoopNotifier", () => {
  it("logs a warning and never throws", async () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const notifier = new NoopNotifier(logger);
    const payload: NotificationFailurePayload = {
      sourceName: "bcv_oficial",
      url: "https://www.bcv.org.ve",
      isoCode: "VES",
      errorMessage: "boom",
      occurredAt: new Date("2026-08-02T12:00:00.000Z"),
    };

    await expect(notifier.notifyFailure(payload)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("bcv_oficial"));
  });
});
