import { parseRationDate } from "./dates.js";
import { RationError } from "./errors.js";
import { fetchJson } from "./httpClient.js";

export interface RationOptions {
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly source?: string;
  readonly timeoutMs?: number;
}

export interface ExchangeRateResult {
  readonly isoCode: string;
  readonly rate: string;
  readonly source: string;
  readonly extractedAt: Date;
}

interface RateApiResponse {
  readonly isoCode: string;
  readonly rate: string;
  readonly source: string;
  readonly extractedAt: string;
}

function readEnvVar(name: string): string | undefined {
  if (typeof process === "undefined" || typeof process.env !== "object") {
    return undefined;
  }
  return process.env[name];
}

function resolveBaseUrl(optionsBaseUrl: string | undefined): string {
  const baseUrl = optionsBaseUrl ?? readEnvVar("RATION_BASE_URL");
  if (!baseUrl) {
    throw new RationError(
      "A baseUrl is required: pass options.baseUrl or set the RATION_BASE_URL environment variable.",
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function toResult(body: RateApiResponse): ExchangeRateResult {
  return {
    isoCode: body.isoCode,
    rate: body.rate,
    source: body.source,
    extractedAt: new Date(body.extractedAt),
  };
}

/**
 * Fetches an exchange rate from a Ratio API instance.
 *
 * - `ration('ARS')` — the most recent rate.
 * - `ration('ARS', '14/04/2026')` — the rate for that date. Accepts
 *   'DD/MM/YYYY', 'YYYY-MM-DD', or a Date.
 */
export async function ration(
  isoCode: string,
  date?: string | Date,
  options: RationOptions = {},
): Promise<ExchangeRateResult> {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const apiKey = options.apiKey ?? readEnvVar("RATION_API_KEY");
  const encodedIsoCode = encodeURIComponent(isoCode);

  const path =
    date === undefined
      ? `/v1/rates/${encodedIsoCode}/latest${buildQuery({ source: options.source })}`
      : `/v1/rates/${encodedIsoCode}${buildQuery({
          date: parseRationDate(date),
          source: options.source,
        })}`;

  const body = await fetchJson<RateApiResponse>(`${baseUrl}${path}`, {
    ...(apiKey !== undefined ? { apiKey } : {}),
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
  });

  return toResult(body);
}
