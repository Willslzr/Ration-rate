import { CurrencyCode, ExchangeRate, RateValue } from "@ratio/core";
import { describe, expect, it, vi } from "vitest";
import { buildServer } from "./buildServer.js";
import type { BuildServerDeps } from "./buildServer.js";

const API_KEY = "test-api-key";

function buildRate() {
  return ExchangeRate.create(
    {
      currency: CurrencyCode.create("VES"),
      rate: RateValue.create("36.5842"),
      source: "bcv_oficial",
      extractedAt: new Date("2026-08-02T10:00:00.000Z"),
    },
    new Date("2026-08-02T12:00:00.000Z"),
  );
}

function buildDeps(overrides: Partial<BuildServerDeps> = {}): BuildServerDeps {
  return {
    getLatestRate: { execute: vi.fn().mockResolvedValue(buildRate()) },
    getRateByDate: { execute: vi.fn().mockResolvedValue(buildRate()) },
    scrapeAllTargets: { execute: vi.fn().mockResolvedValue({ succeeded: [], failed: [] }) },
    targets: [],
    checkDatabaseHealth: vi.fn().mockResolvedValue(true),
    apiKeys: [API_KEY],
    nodeEnv: "test",
    ...overrides,
  };
}

describe("API key authentication (POST /v1/scrape only — GET /v1/rates/* is public)", () => {
  it("returns 401 Problem Details when the x-api-key header is missing", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({ method: "POST", url: "/v1/scrape" });

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.json()).toMatchObject({
      type: "about:blank",
      title: "Unauthorized",
      status: 401,
      code: "UNAUTHORIZED",
    });
  });

  it("returns 401 Problem Details when the x-api-key header is invalid", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({
      method: "POST",
      url: "/v1/scrape",
      headers: { "x-api-key": "wrong-key" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ status: 401, code: "UNAUTHORIZED" });
  });

  it("returns 401 for a key of a different length than any configured key", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({
      method: "POST",
      url: "/v1/scrape",
      headers: { "x-api-key": "short" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 200 when the x-api-key header matches a configured key", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({
      method: "POST",
      url: "/v1/scrape",
      headers: { "x-api-key": API_KEY },
    });

    expect(response.statusCode).toBe(200);
  });

  it("accepts any one of several configured keys", async () => {
    const app = buildServer(buildDeps({ apiKeys: ["key-a", "key-b"] }));

    const response = await app.inject({
      method: "POST",
      url: "/v1/scrape",
      headers: { "x-api-key": "key-b" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("never echoes the received API key back in the response body", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({
      method: "POST",
      url: "/v1/scrape",
      headers: { "x-api-key": "super-secret-value" },
    });

    expect(response.body).not.toContain("super-secret-value");
  });

  it("does not require an API key for /health", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
  });

  it("does not require an API key for GET /v1/rates/:isoCode/latest", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({ method: "GET", url: "/v1/rates/VES/latest" });

    expect(response.statusCode).toBe(200);
  });

  it("does not require an API key for GET /v1/rates/:isoCode", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({ method: "GET", url: "/v1/rates/VES?date=2026-04-14" });

    expect(response.statusCode).toBe(200);
  });
});
