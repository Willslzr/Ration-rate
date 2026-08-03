import { describe, expect, it, vi } from "vitest";
import { RationApiError, RationNetworkError, RationTimeoutError } from "./errors.js";
import { fetchJson } from "./httpClient.js";
import type { FetchFn } from "./httpClient.js";

describe("fetchJson", () => {
  it("returns the parsed JSON body on success", async () => {
    const fetchFn: FetchFn = async () =>
      new Response(JSON.stringify({ hello: "world" }), { status: 200 });

    const result = await fetchJson<{ hello: string }>("https://api.example.com/data", {
      fetchFn,
    });

    expect(result).toEqual({ hello: "world" });
  });

  it("sends the x-api-key header when apiKey is provided", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const fetchFn: FetchFn = async (_url, init) => {
      capturedHeaders = init.headers as Record<string, string>;
      return new Response("{}", { status: 200 });
    };

    await fetchJson("https://api.example.com/data", { fetchFn, apiKey: "secret-key" });

    expect(capturedHeaders?.["x-api-key"]).toBe("secret-key");
  });

  it("omits the x-api-key header when no apiKey is provided", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const fetchFn: FetchFn = async (_url, init) => {
      capturedHeaders = init.headers as Record<string, string>;
      return new Response("{}", { status: 200 });
    };

    await fetchJson("https://api.example.com/data", { fetchFn });

    expect(capturedHeaders?.["x-api-key"]).toBeUndefined();
  });

  it("throws RationApiError with status and detail from a Problem Details body", async () => {
    const fetchFn: FetchFn = async () =>
      new Response(JSON.stringify({ detail: "No exchange rate found." }), { status: 404 });

    try {
      await fetchJson("https://api.example.com/data", { fetchFn });
      expect.unreachable("expected fetchJson to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(RationApiError);
      expect((error as RationApiError).status).toBe(404);
      expect((error as RationApiError).detail).toBe("No exchange rate found.");
    }
  });

  it("falls back to a generic detail when the error body has no `detail` field", async () => {
    const fetchFn: FetchFn = async () => new Response("not json", { status: 500 });

    try {
      await fetchJson("https://api.example.com/data", { fetchFn });
      expect.unreachable("expected fetchJson to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(RationApiError);
      expect((error as RationApiError).status).toBe(500);
      expect((error as RationApiError).detail).toContain("500");
    }
  });

  it("throws RationTimeoutError with the configured timeout when the request is aborted", async () => {
    const fetchFn: FetchFn = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const error = new Error("This operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      });

    try {
      await fetchJson("https://api.example.com/data", { fetchFn, timeoutMs: 10 });
      expect.unreachable("expected fetchJson to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(RationTimeoutError);
      expect((error as RationTimeoutError).timeoutMs).toBe(10);
    }
  });

  it("uses a default timeout of 10 seconds when not specified", async () => {
    vi.useFakeTimers();
    try {
      const fetchFn: FetchFn = (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        });

      const promise = fetchJson("https://api.example.com/data", { fetchFn });
      const expectation = expect(promise).rejects.toThrow(RationTimeoutError);
      await vi.advanceTimersByTimeAsync(10_000);

      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });

  it("throws RationNetworkError when the fetch call fails for another reason", async () => {
    const fetchFn: FetchFn = async () => {
      throw new Error("getaddrinfo ENOTFOUND api.example.com");
    };

    await expect(fetchJson("https://api.example.com/data", { fetchFn })).rejects.toThrow(
      RationNetworkError,
    );
    await expect(fetchJson("https://api.example.com/data", { fetchFn })).rejects.toThrow(
      /ENOTFOUND/,
    );
  });
});
