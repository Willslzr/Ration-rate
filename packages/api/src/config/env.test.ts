import { describe, expect, it } from "vitest";
import { EnvValidationError } from "./EnvValidationError.js";
import { loadEnv } from "./env.js";

describe("loadEnv", () => {
  it("parses a valid environment", () => {
    const env = loadEnv({ DATABASE_URL: "file:./dev.db", NODE_ENV: "development" });

    expect(env).toEqual({
      DATABASE_URL: "file:./dev.db",
      NODE_ENV: "development",
      PORT: 3000,
      CRON_EXPRESSION: "0 * * * *",
    });
  });

  it("defaults NODE_ENV to development when not provided", () => {
    const env = loadEnv({ DATABASE_URL: "file:./dev.db" });

    expect(env.NODE_ENV).toBe("development");
  });

  it("defaults PORT to 3000 and coerces a configured value to a number", () => {
    expect(loadEnv({ DATABASE_URL: "file:./dev.db" }).PORT).toBe(3000);
    expect(loadEnv({ DATABASE_URL: "file:./dev.db", PORT: "8080" }).PORT).toBe(8080);
  });

  it("defaults CRON_EXPRESSION to hourly when not provided", () => {
    const env = loadEnv({ DATABASE_URL: "file:./dev.db" });

    expect(env.CRON_EXPRESSION).toBe("0 * * * *");
  });

  it("leaves webhook variables undefined when not configured", () => {
    const env = loadEnv({ DATABASE_URL: "file:./dev.db" });

    expect(env.DISCORD_WEBHOOK_URL).toBeUndefined();
    expect(env.TELEGRAM_BOT_TOKEN).toBeUndefined();
    expect(env.TELEGRAM_CHAT_ID).toBeUndefined();
  });

  it("accepts configured webhook variables", () => {
    const env = loadEnv({
      DATABASE_URL: "file:./dev.db",
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/abc",
      TELEGRAM_BOT_TOKEN: "bot-token",
      TELEGRAM_CHAT_ID: "chat-id",
    });

    expect(env.DISCORD_WEBHOOK_URL).toBe("https://discord.com/api/webhooks/123/abc");
    expect(env.TELEGRAM_BOT_TOKEN).toBe("bot-token");
    expect(env.TELEGRAM_CHAT_ID).toBe("chat-id");
  });

  it("throws EnvValidationError when DATABASE_URL is missing", () => {
    expect(() => loadEnv({})).toThrow(EnvValidationError);
  });

  it("throws EnvValidationError when DATABASE_URL is empty", () => {
    expect(() => loadEnv({ DATABASE_URL: "" })).toThrow(EnvValidationError);
  });

  it("throws EnvValidationError when NODE_ENV has an unsupported value", () => {
    expect(() => loadEnv({ DATABASE_URL: "file:./dev.db", NODE_ENV: "staging" })).toThrow(
      EnvValidationError,
    );
  });

  it("includes the failing field name in the error message", () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });
});
