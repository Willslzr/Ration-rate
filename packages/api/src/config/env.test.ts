import { describe, expect, it } from "vitest";
import { EnvValidationError } from "./EnvValidationError.js";
import { loadEnv } from "./env.js";

describe("loadEnv", () => {
  it("parses a valid environment", () => {
    const env = loadEnv({ DATABASE_URL: "file:./dev.db", NODE_ENV: "development" });

    expect(env).toEqual({ DATABASE_URL: "file:./dev.db", NODE_ENV: "development" });
  });

  it("defaults NODE_ENV to development when not provided", () => {
    const env = loadEnv({ DATABASE_URL: "file:./dev.db" });

    expect(env.NODE_ENV).toBe("development");
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
