import { RationApiError, RationNetworkError, RationTimeoutError } from "./errors.js";

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

export interface FetchJsonOptions {
  readonly apiKey?: string;
  readonly timeoutMs?: number;
  readonly fetchFn?: FetchFn;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Performs a GET request and parses the JSON body. Maps failures to the SDK's
 * typed errors: a non-2xx response becomes RationApiError (status + detail
 * from the Problem Details body), an aborted request becomes
 * RationTimeoutError, and any other fetch failure becomes RationNetworkError.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const headers: Record<string, string> = {};
  if (options.apiKey) {
    headers["x-api-key"] = options.apiKey;
  }

  let response: Response;
  try {
    response = await fetchFn(url, { method: "GET", headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new RationTimeoutError(timeoutMs);
    }
    throw new RationNetworkError(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await extractProblemDetail(response);
    throw new RationApiError(response.status, detail);
  }

  return (await response.json()) as T;
}

async function extractProblemDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
    ) {
      return (body as { detail: string }).detail;
    }
  } catch {
    // Response body wasn't JSON or had no `detail` field — fall through.
  }
  return `Request failed with status ${response.status}`;
}
