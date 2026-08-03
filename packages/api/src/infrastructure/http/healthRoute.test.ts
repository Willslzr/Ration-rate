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

describe("GET /health", () => {
  it("returns 200 with status ok when the database is reachable", async () => {
    const app = buildServer(buildDeps({ checkDatabaseHealth: async () => true }));

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", database: "ok" });
  });

  it("returns 503 with status error when the database is unreachable", async () => {
    const app = buildServer(buildDeps({ checkDatabaseHealth: async () => false }));

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: "error", database: "error" });
  });

  it("requires no authentication", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).not.toBe(401);
  });

  it("is not under the /v1 prefix", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({ method: "GET", url: "/v1/health" });

    expect(response.statusCode).toBe(404);
  });
});
