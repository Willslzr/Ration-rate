import { RateValue, ScrapeFailedError } from "@ratio/core";
import type { RateExtractor, ScrapeTarget } from "@ratio/core";
import * as cheerio from "cheerio";
import { parseLocaleNumber } from "./parseLocaleNumber.js";

export type FetchFn = (
  url: string,
  init: { signal: AbortSignal; headers: Record<string, string> },
) => Promise<Response>;

const defaultFetch: FetchFn = (url, init) => fetch(url, init);

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface CheerioExtractorOptions {
  readonly fetchFn?: FetchFn;
  readonly timeoutMs?: number;
  readonly userAgent?: string;
}

export class CheerioExtractor implements RateExtractor {
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(options: CheerioExtractorOptions = {}) {
    this.fetchFn = options.fetchFn ?? defaultFetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
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

  private async fetchHtml(target: ScrapeTarget): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchFn(target.url, {
        signal: controller.signal,
        headers: { "User-Agent": this.userAgent },
      });
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError";
      const detail = isTimeout
        ? `timed out after ${this.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
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
