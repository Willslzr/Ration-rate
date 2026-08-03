import { RateValue, ScrapeFailedError } from "@ratio/core";
import type { RateExtractor, ScrapeTarget } from "@ratio/core";
import * as cheerio from "cheerio";
import { Agent } from "undici";
import type { Logger } from "../logging/Logger.js";
import { consoleLogger } from "../logging/Logger.js";
import { parseLocaleNumber } from "./parseLocaleNumber.js";

export interface FetchInit {
  readonly signal: AbortSignal;
  readonly headers: Record<string, string>;
  readonly dispatcher?: Agent;
}

export type FetchFn = (url: string, init: FetchInit) => Promise<Response>;

// Node's global fetch types its `dispatcher` option against @types/node's own
// bundled (older) undici type snapshot, which structurally conflicts with the
// `undici` package's own Agent type even though both describe the same
// runtime class. The cast is safe: at runtime this is always undici's Agent.
const defaultFetch: FetchFn = (url, init) => fetch(url, init as unknown as RequestInit);

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Errors that mean "the server's cert chain is incomplete" (it forgot to send
// an intermediate CA) — common on misconfigured government/public sites, and
// distinct from a genuinely untrustworthy certificate (self-signed, expired,
// hostname mismatch), which we deliberately do NOT auto-relax for.
const INCOMPLETE_CHAIN_ERROR_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
]);

function incompleteChainErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error) || typeof error.cause !== "object" || error.cause === null) {
    return undefined;
  }
  const code = (error.cause as { code?: unknown }).code;
  return typeof code === "string" && INCOMPLETE_CHAIN_ERROR_CODES.has(code) ? code : undefined;
}

function errorDetail(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = error.cause instanceof Error ? `: ${error.cause.message}` : "";
  return `${error.message}${cause}`;
}

export interface CheerioExtractorOptions {
  readonly fetchFn?: FetchFn;
  readonly timeoutMs?: number;
  readonly userAgent?: string;
  readonly logger?: Logger;
}

export class CheerioExtractor implements RateExtractor {
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly userAgent: string;
  private readonly logger: Logger;
  private insecureDispatcher: Agent | undefined;
  /** Hosts a previous request already found to have an incomplete cert chain — skips the doomed-to-fail strict attempt on subsequent calls. */
  private readonly hostsWithIncompleteChain = new Set<string>();

  constructor(options: CheerioExtractorOptions = {}) {
    this.fetchFn = options.fetchFn ?? defaultFetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.logger = options.logger ?? consoleLogger;
  }

  async extract(target: ScrapeTarget): Promise<RateValue> {
    const html = await this.fetchHtml(target);
    const $ = cheerio.load(html);
    const element = $(target.selector);

    if (element.length === 0) {
      throw new ScrapeFailedError(
        `Selector "${target.selector}" matched no elements at ${target.url} (source: ${target.sourceName}).`,
      );
    }

    const text = element.first().text();
    const parsed = parseLocaleNumber(text);
    return RateValue.create(parsed);
  }

  private getInsecureDispatcher(): Agent {
    this.insecureDispatcher ??= new Agent({ connect: { rejectUnauthorized: false } });
    return this.insecureDispatcher;
  }

  /**
   * Fetches target.url, automatically retrying once with certificate
   * verification relaxed — scoped to that one request — if the server sends
   * an incomplete certificate chain. Hosts that need it are remembered so
   * later calls skip straight to the relaxed request instead of failing
   * first every time.
   */
  private async fetchWithChainFallback(target: ScrapeTarget, init: FetchInit): Promise<Response> {
    const host = new URL(target.url).host;

    if (this.hostsWithIncompleteChain.has(host)) {
      return this.fetchFn(target.url, { ...init, dispatcher: this.getInsecureDispatcher() });
    }

    try {
      return await this.fetchFn(target.url, init);
    } catch (error) {
      const code = incompleteChainErrorCode(error);
      if (!code) {
        throw error;
      }
      this.logger.warn(
        `${target.sourceName}: ${host} sent an incomplete TLS certificate chain (${code}) — ` +
          `retrying with certificate verification relaxed for this host only. This is a common ` +
          `misconfiguration (a missing intermediate CA), not necessarily a spoofed certificate — ` +
          `verify the source is trustworthy if you did not expect this.`,
      );
      this.hostsWithIncompleteChain.add(host);
      return this.fetchFn(target.url, { ...init, dispatcher: this.getInsecureDispatcher() });
    }
  }

  private async fetchHtml(target: ScrapeTarget): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchWithChainFallback(target, {
        signal: controller.signal,
        headers: { "User-Agent": this.userAgent },
      });
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      const detail = isTimeout ? `timed out after ${this.timeoutMs}ms` : errorDetail(error);
      throw new ScrapeFailedError(
        `Network error fetching ${target.url} (source: ${target.sourceName}): ${detail}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ScrapeFailedError(
        `HTTP ${response.status} fetching ${target.url} (source: ${target.sourceName}).`,
      );
    }

    return response.text();
  }
}
