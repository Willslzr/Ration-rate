import { readFileSync } from "node:fs";
import path from "node:path";
import { RateValue, ScrapeFailedError } from "@ratio/core";
import type { ScrapeTarget } from "@ratio/core";
import { describe, expect, it } from "vitest";
import { CheerioExtractor } from "./CheerioExtractor.js";
import type { FetchFn } from "./CheerioExtractor.js";

const fixturesDir = path.resolve(import.meta.dirname, "__fixtures__");

function readFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf-8");
}

function buildTarget(overrides: Partial<ScrapeTarget> = {}): ScrapeTarget {
  return {
    isoCode: "VES",
    sourceName: "bcv_oficial",
    url: "https://www.bcv.org.ve",
    type: "html",
    selector: "#dolar .centrado strong",
    active: true,
    ...overrides,
  };
}

describe("CheerioExtractor", () => {
  it("extracts and parses the rate from the selected element", async () => {
    const fetchFn: FetchFn = async () => new Response(readFixture("bcv.html"), { status: 200 });
    const extractor = new CheerioExtractor({ fetchFn });

    const rate = await extractor.extract(buildTarget());

    expect(rate).toBeInstanceOf(RateValue);
    expect(rate.toString()).toBe("36.5842");
  });

  it("sends a realistic User-Agent header", async () => {
    let receivedHeaders: Record<string, string> | undefined;
    const fetchFn: FetchFn = async (_url, init) => {
      receivedHeaders = init.headers;
      return new Response(readFixture("bcv.html"), { status: 200 });
    };
    const extractor = new CheerioExtractor({ fetchFn });

    await extractor.extract(buildTarget());

    expect(receivedHeaders?.["User-Agent"]).toMatch(/Mozilla/);
  });

  it("throws ScrapeFailedError on a non-2xx HTTP response", async () => {
    const fetchFn: FetchFn = async () => new Response("Service Unavailable", { status: 503 });
    const extractor = new CheerioExtractor({ fetchFn });

    await expect(extractor.extract(buildTarget())).rejects.toThrow(ScrapeFailedError);
    await expect(extractor.extract(buildTarget())).rejects.toThrow(/HTTP 503/);
  });

  it("throws ScrapeFailedError when the fetch call fails (network error)", async () => {
    const fetchFn: FetchFn = async () => {
      throw new Error("getaddrinfo ENOTFOUND www.bcv.org.ve");
    };
    const extractor = new CheerioExtractor({ fetchFn });

    await expect(extractor.extract(buildTarget())).rejects.toThrow(ScrapeFailedError);
    await expect(extractor.extract(buildTarget())).rejects.toThrow(/ENOTFOUND/);
  });

  it("throws a timeout-specific ScrapeFailedError when the request is aborted", async () => {
    const fetchFn: FetchFn = async () => {
      const error = new Error("This operation was aborted");
      error.name = "AbortError";
      throw error;
    };
    const extractor = new CheerioExtractor({ fetchFn, timeoutMs: 5000 });

    await expect(extractor.extract(buildTarget())).rejects.toThrow(/timed out after 5000ms/);
  });

  it("throws ScrapeFailedError when the selector matches no elements", async () => {
    const fetchFn: FetchFn = async () =>
      new Response(readFixture("missing-selector.html"), { status: 200 });
    const extractor = new CheerioExtractor({ fetchFn });

    await expect(extractor.extract(buildTarget())).rejects.toThrow(ScrapeFailedError);
    await expect(extractor.extract(buildTarget())).rejects.toThrow(/matched no elements/);
  });

  it("throws ScrapeFailedError when the selected text is not a parseable number", async () => {
    const fetchFn: FetchFn = async () =>
      new Response(readFixture("unparseable.html"), { status: 200 });
    const extractor = new CheerioExtractor({ fetchFn });

    await expect(extractor.extract(buildTarget())).rejects.toThrow(ScrapeFailedError);
  });
});
