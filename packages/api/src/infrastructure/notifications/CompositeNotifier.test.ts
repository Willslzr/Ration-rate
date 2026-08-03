import type { NotificationChannel, NotificationFailurePayload } from "@ratio/core";
import { describe, expect, it, vi } from "vitest";
import { CompositeNotifier } from "./CompositeNotifier.js";

const PAYLOAD: NotificationFailurePayload = {
  sourceName: "bcv_oficial",
  url: "https://www.bcv.org.ve",
  isoCode: "VES",
  errorMessage: "boom",
  occurredAt: new Date("2026-08-02T12:00:00.000Z"),
};

describe("CompositeNotifier", () => {
  it("notifies every configured channel", async () => {
    const a: NotificationChannel = { notifyFailure: vi.fn().mockResolvedValue(undefined) };
    const b: NotificationChannel = { notifyFailure: vi.fn().mockResolvedValue(undefined) };
    const composite = new CompositeNotifier([a, b]);

    await composite.notifyFailure(PAYLOAD);

    expect(a.notifyFailure).toHaveBeenCalledWith(PAYLOAD);
    expect(b.notifyFailure).toHaveBeenCalledWith(PAYLOAD);
  });

  it("still notifies the remaining channels when one rejects", async () => {
    const failing: NotificationChannel = {
      notifyFailure: vi.fn().mockRejectedValue(new Error("channel down")),
    };
    const working: NotificationChannel = { notifyFailure: vi.fn().mockResolvedValue(undefined) };
    const composite = new CompositeNotifier([failing, working]);

    await expect(composite.notifyFailure(PAYLOAD)).resolves.toBeUndefined();

    expect(working.notifyFailure).toHaveBeenCalledWith(PAYLOAD);
  });
});
