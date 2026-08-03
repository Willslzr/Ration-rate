import { afterEach, describe, expect, it, vi } from "vitest";
import { InvalidDateError, RationApiError, RationError } from "./errors.js";
import { ration } from "./ration.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SAMPLE_BODY = {
  isoCode: "VES",
  rate: "36.5842",
  source: "bcv_oficial",
  extractedAt: "2026-08-02T10:00:00.000Z",
};

describe("ration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RATION_BASE_URL;
    delete process.env.RATION_API_KEY;
  });

  it("requests the latest rate when no date is given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE_BODY));
    vi.stubGlobal("fetch", fetchMock);

    const result = await ration("VES", undefined, { baseUrl: "https://api.ratio.dev" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ratio.dev/v1/rates/VES/latest",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toEqual({
      isoCode: "VES",
      rate: "36.5842",
      source: "bcv_oficial",
      extractedAt: new Date("2026-08-02T10:00:00.000Z"),
    });
  });

  it("requests a rate by date, normalizing DD/MM/YYYY", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE_BODY));
    vi.stubGlobal("fetch", fetchMock);

    await ration("VES", "14/04/2026", { baseUrl: "https://api.ratio.dev" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ratio.dev/v1/rates/VES?date=2026-04-14",
      expect.anything(),
    );
  });

  it("accepts a YYYY-MM-DD date string as-is", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE_BODY));
    vi.stubGlobal("fetch", fetchMock);

    await ration("VES", "2026-04-14", { baseUrl: "https://api.ratio.dev" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ratio.dev/v1/rates/VES?date=2026-04-14",
      expect.anything(),
    );
  });

  it("accepts a Date object", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE_BODY));
    vi.stubGlobal("fetch", fetchMock);

    await ration("VES", new Date("2026-04-14T00:00:00.000Z"), {
      baseUrl: "https://api.ratio.dev",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ratio.dev/v1/rates/VES?date=2026-04-14",
      expect.anything(),
    );
  });

  it("forwards the source option on the latest route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE_BODY));
    vi.stubGlobal("fetch", fetchMock);

    await ration("VES", undefined, { baseUrl: "https://api.ratio.dev", source: "paralelo" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ratio.dev/v1/rates/VES/latest?source=paralelo",
      expect.anything(),
    );
  });

  it("forwards the source option on the by-date route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE_BODY));
    vi.stubGlobal("fetch", fetchMock);

    await ration("VES", "2026-04-14", { baseUrl: "https://api.ratio.dev", source: "paralelo" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ratio.dev/v1/rates/VES?date=2026-04-14&source=paralelo",
      expect.anything(),
    );
  });

  it("sends the x-api-key header when apiKey is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE_BODY));
    vi.stubGlobal("fetch", fetchMock);

    await ration("VES", undefined, { baseUrl: "https://api.ratio.dev", apiKey: "secret" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("secret");
  });

  it("falls back to RATION_BASE_URL and RATION_API_KEY environment variables", async () => {
    process.env.RATION_BASE_URL = "https://env.ratio.dev";
    process.env.RATION_API_KEY = "env-secret";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE_BODY));
    vi.stubGlobal("fetch", fetchMock);

    await ration("VES");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://env.ratio.dev/v1/rates/VES/latest");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("env-secret");
  });

  it("prefers explicit options over environment variables", async () => {
    process.env.RATION_BASE_URL = "https://env.ratio.dev";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE_BODY));
    vi.stubGlobal("fetch", fetchMock);

    await ration("VES", undefined, { baseUrl: "https://explicit.ratio.dev" });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://explicit.ratio.dev/v1/rates/VES/latest");
  });

  it("throws RationError when no baseUrl is configured anywhere", async () => {
    await expect(ration("VES")).rejects.toThrow(RationError);
  });

  it("throws InvalidDateError for a malformed date without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(ration("VES", "31/02/2026", { baseUrl: "https://api.ratio.dev" })).rejects.toThrow(
      InvalidDateError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates RationApiError from a non-2xx response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: "No exchange rate found." }, 404));
    vi.stubGlobal("fetch", fetchMock);

    await expect(ration("VES", undefined, { baseUrl: "https://api.ratio.dev" })).rejects.toThrow(
      RationApiError,
    );
  });

  it("rejects a 2xx response with a missing field instead of returning bad data", async () => {
    const { rate: _rate, ...bodyWithoutRate } = SAMPLE_BODY;
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(bodyWithoutRate));
    vi.stubGlobal("fetch", fetchMock);

    await expect(ration("VES", undefined, { baseUrl: "https://api.ratio.dev" })).rejects.toThrow(
      RationError,
    );
  });

  it("rejects a 2xx response with an unparseable extractedAt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ...SAMPLE_BODY, extractedAt: "not-a-date" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(ration("VES", undefined, { baseUrl: "https://api.ratio.dev" })).rejects.toThrow(
      RationError,
    );
  });

  it("rejects a non-object 2xx response body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse("not an object"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(ration("VES", undefined, { baseUrl: "https://api.ratio.dev" })).rejects.toThrow(
      RationError,
    );
  });
});
