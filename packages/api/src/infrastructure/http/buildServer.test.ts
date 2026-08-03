import { RateNotFoundError } from "@ratio/core";
import { describe, expect, it, vi } from "vitest";
import { buildServer } from "./buildServer.js";
import type { BuildServerDeps } from "./buildServer.js";

function buildDeps(overrides: Partial<BuildServerDeps> = {}): BuildServerDeps {
  return {
    getLatestRate: { execute: vi.fn().mockRejectedValue(new RateNotFoundError("not found")) },
    getRateByDate: { execute: vi.fn().mockRejectedValue(new RateNotFoundError("not found")) },
    scrapeAllTargets: { execute: vi.fn().mockResolvedValue({ succeeded: [], failed: [] }) },
    targets: [],
    checkDatabaseHealth: vi.fn().mockResolvedValue(true),
    nodeEnv: "test",
    ...overrides,
  };
}

describe("buildServer", () => {
  it("builds a working Fastify instance", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({ method: "GET", url: "/does-not-exist" });

    expect(response.statusCode).toBe(404);
  });

  it("keeps no global state — two instances never share routes", async () => {
    const appA = buildServer(buildDeps());
    const appB = buildServer(buildDeps());
    appA.get("/marker", async () => ({ from: "a" }));

    const responseA = await appA.inject({ method: "GET", url: "/marker" });
    const responseB = await appB.inject({ method: "GET", url: "/marker" });

    expect(responseA.statusCode).toBe(200);
    expect(responseB.statusCode).toBe(404);
  });

  it("assigns a UUID-shaped request id to each request", async () => {
    const app = buildServer(buildDeps());
    let capturedId = "";
    app.get("/id", async (request) => {
      capturedId = request.id;
      return { id: request.id };
    });

    await app.inject({ method: "GET", url: "/id" });

    expect(capturedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("silences the logger in test mode by default", () => {
    const app = buildServer(buildDeps());

    expect(app.log.level).toBe("silent");
  });

  it("sets security headers (helmet) on every response, including errors", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({ method: "GET", url: "/does-not-exist" });

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-dns-prefetch-control"]).toBe("off");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });
});
