import { CurrencyCode, ExchangeRate, RateValue } from "@ratio/core";
import { describe, expect, it, vi } from "vitest";
import { buildServer } from "./buildServer.js";
import type { BuildServerDeps } from "./buildServer.js";

const NOW = new Date("2026-08-02T12:00:00.000Z");
const API_KEY = "test-api-key";
const AUTH_HEADERS = { "x-api-key": API_KEY };

function buildRate(overrides: { source?: string; extractedAt?: string; rate?: string } = {}) {
  return ExchangeRate.create(
    {
      currency: CurrencyCode.create("VES"),
      rate: RateValue.create(overrides.rate ?? "36.5842"),
      source: overrides.source ?? "bcv_oficial",
      extractedAt: new Date(overrides.extractedAt ?? "2026-08-02T10:00:00.000Z"),
    },
    NOW,
  );
}

function buildDeps(overrides: Partial<BuildServerDeps> = {}): BuildServerDeps {
  return {
    getLatestRate: { execute: vi.fn() },
    getRateByDate: { execute: vi.fn() },
    checkDatabaseHealth: vi.fn().mockResolvedValue(true),
    apiKeys: [API_KEY],
    nodeEnv: "test",
    ...overrides,
  };
}

describe("GET /v1/rates/:isoCode/latest", () => {
  it("returns 200 with the latest rate", async () => {
    const execute = vi.fn().mockResolvedValue(buildRate());
    const app = buildServer(buildDeps({ getLatestRate: { execute } }));

    const response = await app.inject({
      method: "GET",
      url: "/v1/rates/VES/latest",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      isoCode: "VES",
      rate: "36.5842",
      source: "bcv_oficial",
      extractedAt: "2026-08-02T10:00:00.000Z",
    });
    expect(execute).toHaveBeenCalledWith("VES", undefined);
  });

  it("forwards the optional source query param", async () => {
    const execute = vi.fn().mockResolvedValue(buildRate({ source: "paralelo" }));
    const app = buildServer(buildDeps({ getLatestRate: { execute } }));

    await app.inject({
      method: "GET",
      url: "/v1/rates/VES/latest?source=paralelo",
      headers: AUTH_HEADERS,
    });

    expect(execute).toHaveBeenCalledWith("VES", "paralelo");
  });

  it.each(["V", "VE", "VESS", "V3S", "123"])(
    "returns 400 for an invalid isoCode: %j",
    async (isoCode) => {
      const app = buildServer(buildDeps());

      const response = await app.inject({
        method: "GET",
        url: `/v1/rates/${isoCode}/latest`,
        headers: AUTH_HEADERS,
      });

      expect(response.statusCode).toBe(400);
    },
  );
});

describe("GET /v1/rates/:isoCode", () => {
  it("returns 200 with the rate for the given date", async () => {
    const execute = vi
      .fn()
      .mockResolvedValue(buildRate({ extractedAt: "2026-04-14T09:00:00.000Z" }));
    const app = buildServer(buildDeps({ getRateByDate: { execute } }));

    const response = await app.inject({
      method: "GET",
      url: "/v1/rates/VES?date=2026-04-14",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      isoCode: "VES",
      extractedAt: "2026-04-14T09:00:00.000Z",
    });
    expect(execute).toHaveBeenCalledWith("VES", "2026-04-14", undefined);
  });

  it("forwards the optional source query param", async () => {
    const execute = vi.fn().mockResolvedValue(buildRate());
    const app = buildServer(buildDeps({ getRateByDate: { execute } }));

    await app.inject({
      method: "GET",
      url: "/v1/rates/VES?date=2026-04-14&source=paralelo",
      headers: AUTH_HEADERS,
    });

    expect(execute).toHaveBeenCalledWith("VES", "2026-04-14", "paralelo");
  });

  it("returns 400 when the date query param is missing", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({
      method: "GET",
      url: "/v1/rates/VES",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(400);
  });

  it.each(["14/04/2026", "2026-4-14", "not-a-date", "2026/04/14"])(
    "returns 400 for a malformed date: %j",
    async (date) => {
      const app = buildServer(buildDeps());

      const response = await app.inject({
        method: "GET",
        url: `/v1/rates/VES?date=${encodeURIComponent(date)}`,
        headers: AUTH_HEADERS,
      });

      expect(response.statusCode).toBe(400);
    },
  );

  it("returns 400 for an invalid isoCode", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({
      method: "GET",
      url: "/v1/rates/V3S?date=2026-04-14",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(400);
  });
});
