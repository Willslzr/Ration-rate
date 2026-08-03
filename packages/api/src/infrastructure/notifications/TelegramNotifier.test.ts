import type { NotificationFailurePayload } from "@ratio/core";
import { describe, expect, it, vi } from "vitest";
import { TelegramNotifier } from "./TelegramNotifier.js";
import type { WebhookFetchFn } from "./WebhookNotifier.js";

const PAYLOAD: NotificationFailurePayload = {
  sourceName: "bcv_oficial",
  url: "https://www.bcv.org.ve",
  isoCode: "VES",
  errorMessage: "selector not found",
  occurredAt: new Date("2026-08-02T12:00:00.000Z"),
};

describe("TelegramNotifier", () => {
  it("posts a { chat_id, text } payload to the sendMessage endpoint", async () => {
    let capturedUrl: string | undefined;
    let capturedInit: { method: string; headers: Record<string, string>; body: string } | undefined;
    const fetchFn: WebhookFetchFn = async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const notifier = new TelegramNotifier("bot-token-123", "chat-456", fetchFn);

    await notifier.notifyFailure(PAYLOAD);

    expect(capturedUrl).toBe("https://api.telegram.org/botbot-token-123/sendMessage");
    expect(capturedInit?.method).toBe("POST");

    const body = JSON.parse(capturedInit?.body ?? "{}") as { chat_id: string; text: string };
    expect(body.chat_id).toBe("chat-456");
    expect(body.text).toContain("VES");
    expect(body.text).toContain("selector not found");
  });

  it("logs and swallows a network failure instead of throwing", async () => {
    const fetchFn: WebhookFetchFn = async () => {
      throw new Error("network down");
    };
    const logger = { info: vi.fn(), warn: vi.fn() };
    const notifier = new TelegramNotifier("bot-token-123", "chat-456", fetchFn, logger);

    await expect(notifier.notifyFailure(PAYLOAD)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("network down"));
  });

  it("logs a warning on a non-2xx response without throwing", async () => {
    const fetchFn: WebhookFetchFn = async () => new Response("forbidden", { status: 403 });
    const logger = { info: vi.fn(), warn: vi.fn() };
    const notifier = new TelegramNotifier("bot-token-123", "chat-456", fetchFn, logger);

    await expect(notifier.notifyFailure(PAYLOAD)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("403"));
  });
});
