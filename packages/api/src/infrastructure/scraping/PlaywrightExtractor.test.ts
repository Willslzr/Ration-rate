import { RateValue } from "@ratio/core";
import type { ScrapeTarget } from "@ratio/core";
import { describe, expect, it } from "vitest";
import { PlaywrightExtractor } from "./PlaywrightExtractor.js";

/**
 * Smoke test against the real BCV site — needs network access and a downloaded
 * Chromium binary, so it's skipped by default and must never run in CI.
 *
 * To run it locally:
 *   1. pnpm --filter @ratio/api exec playwright install chromium
 *   2. Change `it.skip` below to `it`.
 *   3. pnpm --filter @ratio/api exec vitest run PlaywrightExtractor.test.ts
 */
describe("PlaywrightExtractor", () => {
  it.skip("smoke: extracts the official BCV rate from the real site", async () => {
    const target: ScrapeTarget = {
      isoCode: "VES",
      sourceName: "bcv_oficial",
      url: "https://www.bcv.org.ve",
      type: "spa",
      selector: "#dolar .centrado strong",
      active: true,
    };
    const extractor = new PlaywrightExtractor();

    try {
      const rate = await extractor.extract(target);
      expect(rate).toBeInstanceOf(RateValue);
    } finally {
      await extractor.dispose();
    }
  });
});
