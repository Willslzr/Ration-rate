import { readFileSync } from "node:fs";
import path from "node:path";
import { RateValue, ScrapeFailedError } from "@ratio/core";
import type { ScrapeTarget } from "@ratio/core";
import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../logging/Logger.js";
import { CheerioExtractor } from "./CheerioExtractor.js";
import type { FetchFn } from "./CheerioExtractor.js";

function incompleteChainError(): Error {
  return new Error("fetch failed", {
    cause: Object.assign(new Error("unable to verify the first certificate"), {
      code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    }),
  });
}

function fakeLogger(): Logger {
  return { info: vi.fn(), warn: vi.fn() };
}

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

  describe("incomplete TLS certificate chains", () => {
    it("retries once with certificate verification relaxed and succeeds", async () => {
      let calls = 0;
      const fetchFn: FetchFn = async (_url, init) => {
        calls += 1;
        if (calls === 1) {
          expect(init.dispatcher).toBeUndefined();
          throw incompleteChainError();
        }
        expect(init.dispatcher).toBeDefined();
        return new Response(readFixture("bcv.html"), { status: 200 });
      };
      const logger = fakeLogger();
      const extractor = new CheerioExtractor({ fetchFn, logger });

      const rate = await extractor.extract(buildTarget());

      expect(rate.toString()).toBe("36.5842");
      expect(calls).toBe(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("UNABLE_TO_VERIFY_LEAF_SIGNATURE"),
      );
    });

    it("skips the doomed first attempt on a later call to the same host", async () => {
      let calls = 0;
      const fetchFn: FetchFn = async (_url, init) => {
        calls += 1;
        if (calls === 1) {
          throw incompleteChainError();
        }
        expect(init.dispatcher).toBeDefined();
        return new Response(readFixture("bcv.html"), { status: 200 });
      };
      const extractor = new CheerioExtractor({ fetchFn, logger: fakeLogger() });

      await extractor.extract(buildTarget());
      await extractor.extract(buildTarget());

      // First call: 1 failed + 1 relaxed retry. Second call: straight to relaxed. Total 3, not 4.
      expect(calls).toBe(3);
    });

    it("does not retry and still throws ScrapeFailedError for an unrelated TLS/network error", async () => {
      const fetchFn: FetchFn = async () => {
        throw new Error("fetch failed", {
          cause: Object.assign(new Error("self-signed certificate"), {
            code: "DEPTH_ZERO_SELF_SIGNED_CERT",
          }),
        });
      };
      const extractor = new CheerioExtractor({ fetchFn, logger: fakeLogger() });

      await expect(extractor.extract(buildTarget())).rejects.toThrow(ScrapeFailedError);
      await expect(extractor.extract(buildTarget())).rejects.toThrow(/self-signed certificate/);
    });
  });
});
