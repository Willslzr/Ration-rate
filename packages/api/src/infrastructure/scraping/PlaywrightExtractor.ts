import { RateValue, ScrapeFailedError } from "@ratio/core";
import type { RateExtractor, ScrapeTarget } from "@ratio/core";
import type { Browser, Locator, Page } from "playwright";
import { chromium } from "playwright";
import { parseLocaleNumber } from "./parseLocaleNumber.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface PlaywrightExtractorOptions {
  readonly timeoutMs?: number;
  readonly userAgent?: string;
}

export class PlaywrightExtractor implements RateExtractor {
  private readonly timeoutMs: number;
  private readonly userAgent: string;
  private browserPromise: Promise<Browser> | undefined;

  constructor(options: PlaywrightExtractorOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }

  async extract(target: ScrapeTarget): Promise<RateValue> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({ userAgent: this.userAgent });

    try {
      const page = await context.newPage();
      await this.navigate(page, target);

      const locator = page.locator(target.selector).first();
      await this.waitForSelector(locator, target);

      const text = await locator.textContent();
      if (text === null) {
        throw new ScrapeFailedError(
          `Selector "${target.selector}" matched no text content at ${target.url} (source: ${target.sourceName}).`,
        );
      }

      const parsed = parseLocaleNumber(text);
      return RateValue.create(parsed);
    } finally {
      await context.close();
    }
  }

  /** Lazily launches Chromium on first use; call dispose() to shut it down. */
  private async getBrowser(): Promise<Browser> {
    this.browserPromise ??= chromium.launch({ headless: true });
    return this.browserPromise;
  }

  async dispose(): Promise<void> {
    if (!this.browserPromise) {
      return;
    }
    const browser = await this.browserPromise;
    this.browserPromise = undefined;
    await browser.close();
  }

  private async navigate(page: Page, target: ScrapeTarget): Promise<void> {
    try {
      await page.goto(target.url, { waitUntil: "networkidle", timeout: this.timeoutMs });
    } catch (error) {
      throw new ScrapeFailedError(
        `Failed to load ${target.url} (source: ${target.sourceName}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async waitForSelector(locator: Locator, target: ScrapeTarget): Promise<void> {
    try {
      await locator.waitFor({ state: "visible", timeout: this.timeoutMs });
    } catch (error) {
      throw new ScrapeFailedError(
        `Selector "${target.selector}" never became visible at ${target.url} (source: ${target.sourceName}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
