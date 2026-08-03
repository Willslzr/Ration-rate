import type { NotificationFailurePayload } from "@ratio/core";
import { describe, expect, it, vi } from "vitest";
import { DiscordNotifier } from "./DiscordNotifier.js";
import type { WebhookFetchFn } from "./WebhookNotifier.js";

const PAYLOAD: NotificationFailurePayload = {
  sourceName: "bcv_oficial",
  url: "https://www.bcv.org.ve",
  isoCode: "VES",
  errorMessage: "selector not found",
  occurredAt: new Date("2026-08-02T12:00:00.000Z"),
};

describe("DiscordNotifier", () => {
  it("posts a { content } payload to the webhook URL", async () => {
    let capturedUrl: string | undefined;
    let capturedInit: { method: string; headers: Record<string, string>; body: string } | undefined;
    const fetchFn: WebhookFetchFn = async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return new Response(null, { status: 204 });
    };
    const notifier = new DiscordNotifier("https://discord.com/api/webhooks/123/abc", fetchFn);

    await notifier.notifyFailure(PAYLOAD);

    expect(capturedUrl).toBe("https://discord.com/api/webhooks/123/abc");
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(capturedInit?.body ?? "{}") as { content: string };
    expect(body.content).toContain("VES");
    expect(body.content).toContain("bcv_oficial");
    expect(body.content).toContain("selector not found");
  });

  it("logs and swallows a network failure instead of throwing", async () => {
    const fetchFn: WebhookFetchFn = async () => {
      throw new Error("network down");
    };
    const logger = { info: vi.fn(), warn: vi.fn() };
    const notifier = new DiscordNotifier(
      "https://discord.com/api/webhooks/123/abc",
      fetchFn,
      logger,
    );

    await expect(notifier.notifyFailure(PAYLOAD)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("network down"));
  });

  it("logs a warning on a non-2xx response without throwing", async () => {
    const fetchFn: WebhookFetchFn = async () => new Response("rate limited", { status: 429 });
    const logger = { info: vi.fn(), warn: vi.fn() };
    const notifier = new DiscordNotifier(
      "https://discord.com/api/webhooks/123/abc",
      fetchFn,
      logger,
    );

    await expect(notifier.notifyFailure(PAYLOAD)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("429"));
  });
});
