import type { Env } from "../config/env.js";
import {
  CompositeNotifier,
  DiscordNotifier,
  NoopNotifier,
  TelegramNotifier,
} from "../infrastructure/notifications/index.js";
import { describe, expect, it } from "vitest";
import { buildNotifier } from "./container.js";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    DATABASE_URL: "file:./dev.db",
    NODE_ENV: "test",
    PORT: 3000,
    CRON_EXPRESSION: "0 * * * *",
    ...overrides,
  };
}

describe("buildNotifier", () => {
  it("falls back to NoopNotifier when no webhook is configured", () => {
    expect(buildNotifier(buildEnv())).toBeInstanceOf(NoopNotifier);
  });

  it("returns a DiscordNotifier when only the Discord webhook is configured", () => {
    const notifier = buildNotifier(
      buildEnv({ DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/abc" }),
    );

    expect(notifier).toBeInstanceOf(DiscordNotifier);
  });

  it("returns a TelegramNotifier when only Telegram is fully configured", () => {
    const notifier = buildNotifier(
      buildEnv({ TELEGRAM_BOT_TOKEN: "bot-token", TELEGRAM_CHAT_ID: "chat-id" }),
    );

    expect(notifier).toBeInstanceOf(TelegramNotifier);
  });

  it("does not configure Telegram when only the bot token is set", () => {
    expect(buildNotifier(buildEnv({ TELEGRAM_BOT_TOKEN: "bot-token" }))).toBeInstanceOf(
      NoopNotifier,
    );
  });

  it("returns a CompositeNotifier when both Discord and Telegram are configured", () => {
    const notifier = buildNotifier(
      buildEnv({
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/abc",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "chat-id",
      }),
    );

    expect(notifier).toBeInstanceOf(CompositeNotifier);
  });
});
