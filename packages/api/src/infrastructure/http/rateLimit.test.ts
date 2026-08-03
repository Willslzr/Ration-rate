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
    getRateByDate: { execute: vi.fn() },
    scrapeAllTargets: { execute: vi.fn() },
    targets: [],
    checkDatabaseHealth: vi.fn().mockResolvedValue(true),
    apiKeys: [API_KEY],
    nodeEnv: "test",
    ...overrides,
  };
}

describe("rate limiting", () => {
  it("returns 429 Problem Details with Retry-After once the limit is exceeded", async () => {
    const app = buildServer(buildDeps({ rateLimitMax: 2 }));
    const headers = { "x-api-key": API_KEY };

    const first = await app.inject({ method: "GET", url: "/v1/rates/VES/latest", headers });
    const second = await app.inject({ method: "GET", url: "/v1/rates/VES/latest", headers });
    const third = await app.inject({ method: "GET", url: "/v1/rates/VES/latest", headers });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    expect(third.headers["retry-after"]).toBeDefined();
    expect(third.headers["content-type"]).toContain("application/problem+json");
    expect(third.json()).toMatchObject({
      type: "about:blank",
      title: "Too Many Requests",
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
    });
  });

  it("rate-limits unauthenticated requests (e.g. /health) by IP", async () => {
    const app = buildServer(buildDeps({ rateLimitMax: 1 }));

    const first = await app.inject({ method: "GET", url: "/health" });
    const second = await app.inject({ method: "GET", url: "/health" });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
  });

  it("tracks a separate limit per API key", async () => {
    const app = buildServer(buildDeps({ apiKeys: ["key-a", "key-b"], rateLimitMax: 1 }));

    const a1 = await app.inject({
      method: "GET",
      url: "/v1/rates/VES/latest",
      headers: { "x-api-key": "key-a" },
    });
    const b1 = await app.inject({
      method: "GET",
      url: "/v1/rates/VES/latest",
      headers: { "x-api-key": "key-b" },
    });

    expect(a1.statusCode).toBe(200);
    expect(b1.statusCode).toBe(200);
  });

  it("defaults to 100 requests per minute when not configured", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({
      method: "GET",
      url: "/v1/rates/VES/latest",
      headers: { "x-api-key": API_KEY },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-ratelimit-limit"]).toBe("100");
  });
});
