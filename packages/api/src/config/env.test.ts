import { describe, expect, it } from "vitest";
import { EnvValidationError } from "./EnvValidationError.js";
import { loadEnv } from "./env.js";

function baseEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return { DATABASE_URL: "file:./dev.db", API_KEYS: "test-key", ...overrides };
}

describe("loadEnv", () => {
  it("parses a valid environment", () => {
    const env = loadEnv(baseEnv({ NODE_ENV: "development" }));

    expect(env).toEqual({
      DATABASE_URL: "file:./dev.db",
      NODE_ENV: "development",
      PORT: 3000,
      CRON_EXPRESSION: "0 * * * *",
      API_KEYS: ["test-key"],
      RATE_LIMIT_MAX: 100,
    });
  });

  it("defaults NODE_ENV to development when not provided", () => {
    const env = loadEnv(baseEnv());

    expect(env.NODE_ENV).toBe("development");
  });

  it("defaults PORT to 3000 and coerces a configured value to a number", () => {
    expect(loadEnv(baseEnv()).PORT).toBe(3000);
    expect(loadEnv(baseEnv({ PORT: "8080" })).PORT).toBe(8080);
  });

  it("defaults CRON_EXPRESSION to hourly when not provided", () => {
    const env = loadEnv(baseEnv());

    expect(env.CRON_EXPRESSION).toBe("0 * * * *");
  });

  it("leaves webhook variables undefined when not configured", () => {
    const env = loadEnv(baseEnv());

    expect(env.DISCORD_WEBHOOK_URL).toBeUndefined();
    expect(env.TELEGRAM_BOT_TOKEN).toBeUndefined();
    expect(env.TELEGRAM_CHAT_ID).toBeUndefined();
  });

  it("accepts configured webhook variables", () => {
    const env = loadEnv(
      baseEnv({
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/abc",
        TELEGRAM_BOT_TOKEN: "bot-token",
        TELEGRAM_CHAT_ID: "chat-id",
      }),
    );

    expect(env.DISCORD_WEBHOOK_URL).toBe("https://discord.com/api/webhooks/123/abc");
    expect(env.TELEGRAM_BOT_TOKEN).toBe("bot-token");
    expect(env.TELEGRAM_CHAT_ID).toBe("chat-id");
  });

  it("splits API_KEYS on commas and trims each key", () => {
    const env = loadEnv(baseEnv({ API_KEYS: " key-one ,key-two,  key-three" }));

    expect(env.API_KEYS).toEqual(["key-one", "key-two", "key-three"]);
  });

  it("throws EnvValidationError when API_KEYS is missing", () => {
    expect(() => loadEnv({ DATABASE_URL: "file:./dev.db" })).toThrow(EnvValidationError);
  });

  it("throws EnvValidationError when API_KEYS is only commas/whitespace", () => {
    expect(() => loadEnv(baseEnv({ API_KEYS: " , , " }))).toThrow(EnvValidationError);
  });

  it("defaults RATE_LIMIT_MAX to 100 and coerces a configured value to a number", () => {
    expect(loadEnv(baseEnv()).RATE_LIMIT_MAX).toBe(100);
    expect(loadEnv(baseEnv({ RATE_LIMIT_MAX: "50" })).RATE_LIMIT_MAX).toBe(50);
  });

  it("throws EnvValidationError when DATABASE_URL is missing", () => {
    expect(() => loadEnv({ API_KEYS: "test-key" })).toThrow(EnvValidationError);
  });

  it("throws EnvValidationError when DATABASE_URL is empty", () => {
    expect(() => loadEnv(baseEnv({ DATABASE_URL: "" }))).toThrow(EnvValidationError);
  });

  it("throws EnvValidationError when NODE_ENV has an unsupported value", () => {
    expect(() => loadEnv(baseEnv({ NODE_ENV: "staging" }))).toThrow(EnvValidationError);
  });

  it("includes the failing field name in the error message", () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });
});
