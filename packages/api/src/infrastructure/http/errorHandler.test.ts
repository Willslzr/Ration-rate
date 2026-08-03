import { InvalidCurrencyError, InvalidDateError, RateNotFoundError } from "@ratio/core";
import { describe, expect, it, vi } from "vitest";
import { buildServer } from "./buildServer.js";
import type { BuildServerDeps } from "./buildServer.js";

function buildDeps(overrides: Partial<BuildServerDeps> = {}): BuildServerDeps {
  return {
    getLatestRate: { execute: vi.fn() },
    getRateByDate: { execute: vi.fn() },
    scrapeAllTargets: { execute: vi.fn() },
    targets: [],
    checkDatabaseHealth: vi.fn().mockResolvedValue(true),
    nodeEnv: "test",
    ...overrides,
  };
}

describe("error handler", () => {
  it("maps RateNotFoundError to a 404 Problem Details response", async () => {
    const execute = vi.fn().mockRejectedValue(new RateNotFoundError("No rate for VES"));
    const app = buildServer(buildDeps({ getLatestRate: { execute } }));

    const response = await app.inject({ method: "GET", url: "/v1/rates/VES/latest" });

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    const body = response.json();
    expect(body).toMatchObject({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "No rate for VES",
      code: "RATE_NOT_FOUND",
    });
    expect(typeof body.correlationId).toBe("string");
    expect(body.correlationId.length).toBeGreaterThan(0);
  });

  it("maps InvalidCurrencyError to a 400 Problem Details response", async () => {
    const execute = vi.fn().mockRejectedValue(new InvalidCurrencyError("XYZ"));
    const app = buildServer(buildDeps({ getLatestRate: { execute } }));

    const response = await app.inject({ method: "GET", url: "/v1/rates/XYZ/latest" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ status: 400, code: "INVALID_CURRENCY" });
  });

  it("maps InvalidDateError to a 400 Problem Details response", async () => {
    const execute = vi.fn().mockRejectedValue(new InvalidDateError("bad date"));
    const app = buildServer(buildDeps({ getRateByDate: { execute } }));

    const response = await app.inject({ method: "GET", url: "/v1/rates/VES?date=2026-04-14" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ status: 400, code: "INVALID_DATE" });
  });

  it("maps a TypeBox validation failure to a 400 Problem Details response", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({ method: "GET", url: "/v1/rates/V3S/latest" });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.json()).toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
  });

  it("maps an unexpected error to 500 without leaking internal details", async () => {
    const execute = vi
      .fn()
      .mockRejectedValue(new Error("something exploded with a secret path /etc/passwd"));
    const app = buildServer(buildDeps({ getLatestRate: { execute } }));

    const response = await app.inject({ method: "GET", url: "/v1/rates/VES/latest" });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body).toMatchObject({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
      code: "INTERNAL_ERROR",
    });
    expect(body.detail).not.toContain("secret");
    expect(body.detail).not.toContain("/etc/passwd");
    expect(typeof body.correlationId).toBe("string");
    expect(body.correlationId.length).toBeGreaterThan(0);
  });
});
