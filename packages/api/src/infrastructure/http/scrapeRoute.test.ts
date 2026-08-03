import type { ScrapeSummary, ScrapeTarget } from "@ratio/core";
import { describe, expect, it, vi } from "vitest";
import { buildServer } from "./buildServer.js";
import type { BuildServerDeps } from "./buildServer.js";

const API_KEY = "test-api-key";
const AUTH_HEADERS = { "x-api-key": API_KEY };

const ACTIVE_TARGET: ScrapeTarget = {
  isoCode: "VES",
  sourceName: "bcv_oficial",
  url: "https://www.bcv.org.ve",
  type: "html",
  selector: "#dolar",
  active: true,
};

const INACTIVE_TARGET: ScrapeTarget = {
  ...ACTIVE_TARGET,
  sourceName: "paralelo",
  active: false,
};

function buildDeps(overrides: Partial<BuildServerDeps> = {}): BuildServerDeps {
  return {
    getLatestRate: { execute: vi.fn() },
    getRateByDate: { execute: vi.fn() },
    scrapeAllTargets: { execute: vi.fn().mockResolvedValue({ succeeded: [], failed: [] }) },
    targets: [ACTIVE_TARGET, INACTIVE_TARGET],
    checkDatabaseHealth: vi.fn().mockResolvedValue(true),
    apiKeys: [API_KEY],
    nodeEnv: "test",
    ...overrides,
  };
}

describe("POST /v1/scrape", () => {
  it("returns 200 with the summary and only scrapes active targets", async () => {
    const execute = vi.fn().mockResolvedValue({ succeeded: ["bcv_oficial"], failed: [] });
    const app = buildServer(buildDeps({ scrapeAllTargets: { execute } }));

    const response = await app.inject({
      method: "POST",
      url: "/v1/scrape",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ succeeded: ["bcv_oficial"], failed: [] });
    expect(execute).toHaveBeenCalledWith([ACTIVE_TARGET]);
  });

  it("returns 207 when the summary has partial failures", async () => {
    const execute = vi.fn().mockResolvedValue({ succeeded: ["bcv_oficial"], failed: ["paralelo"] });
    const app = buildServer(buildDeps({ scrapeAllTargets: { execute } }));

    const response = await app.inject({
      method: "POST",
      url: "/v1/scrape",
      headers: AUTH_HEADERS,
    });

    expect(response.statusCode).toBe(207);
    expect(response.json()).toEqual({ succeeded: ["bcv_oficial"], failed: ["paralelo"] });
  });

  it("returns 401 Problem Details without an api key", async () => {
    const app = buildServer(buildDeps());

    const response = await app.inject({ method: "POST", url: "/v1/scrape" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns 409 when a scrape is already running, then releases the lock once it finishes", async () => {
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    let resolveExecute!: (summary: ScrapeSummary) => void;
    // Only the first call hangs (to simulate an in-flight scrape); later calls
    // (the third request, after the lock is released) resolve immediately.
    let calls = 0;
    const execute = vi.fn().mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        markStarted();
        return new Promise<ScrapeSummary>((resolve) => {
          resolveExecute = resolve;
        });
      }
      return Promise.resolve({ succeeded: ["bcv_oficial"], failed: [] });
    });
    const app = buildServer(buildDeps({ scrapeAllTargets: { execute } }));

    const firstRequest = app.inject({ method: "POST", url: "/v1/scrape", headers: AUTH_HEADERS });
    await started; // resolves the instant the first execute() call is made

    const secondResponse = await app.inject({
      method: "POST",
      url: "/v1/scrape",
      headers: AUTH_HEADERS,
    });
    expect(secondResponse.statusCode).toBe(409);
    expect(secondResponse.json()).toMatchObject({ code: "SCRAPE_IN_PROGRESS" });

    resolveExecute({ succeeded: ["bcv_oficial"], failed: [] });
    const firstResponse = await firstRequest;
    expect(firstResponse.statusCode).toBe(200);

    // The lock must be released — a new request right after should succeed, not 409.
    const thirdResponse = await app.inject({
      method: "POST",
      url: "/v1/scrape",
      headers: AUTH_HEADERS,
    });
    expect(thirdResponse.statusCode).toBe(200);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
