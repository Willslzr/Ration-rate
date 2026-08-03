import { DomainError } from "@ratio/core";
import type { RateExtractor, ScrapeTarget } from "@ratio/core";
import { describe, expect, it } from "vitest";
import { CheerioExtractor } from "./CheerioExtractor.js";
import { ExtractorFactory } from "./ExtractorFactory.js";
import { PlaywrightExtractor } from "./PlaywrightExtractor.js";

function buildTarget(overrides: Partial<ScrapeTarget> = {}): ScrapeTarget {
  return {
    isoCode: "VES",
    sourceName: "bcv_oficial",
    url: "https://www.bcv.org.ve",
    type: "html",
    selector: "#dolar",
    active: true,
    ...overrides,
  };
}

class FakeExtractor implements RateExtractor {
  async extract(): Promise<never> {
    throw new Error("not implemented");
  }
}

describe("ExtractorFactory", () => {
  it("returns a CheerioExtractor for html targets", () => {
    const factory = new ExtractorFactory();

    expect(factory.getExtractor(buildTarget({ type: "html" }))).toBeInstanceOf(CheerioExtractor);
  });

  it("returns a PlaywrightExtractor for spa targets", () => {
    const factory = new ExtractorFactory();

    expect(factory.getExtractor(buildTarget({ type: "spa" }))).toBeInstanceOf(PlaywrightExtractor);
  });

  it("reuses the same extractor instance across targets of the same type", () => {
    const factory = new ExtractorFactory();

    const first = factory.getExtractor(buildTarget({ type: "html", sourceName: "bcv_oficial" }));
    const second = factory.getExtractor(buildTarget({ type: "html", sourceName: "paralelo" }));

    expect(first).toBe(second);
  });

  it("throws a DomainError for an unknown target type", () => {
    const factory = new ExtractorFactory();
    const target = buildTarget({ type: "unknown" as ScrapeTarget["type"] });

    expect(() => factory.getExtractor(target)).toThrow(DomainError);
    expect(() => factory.getExtractor(target)).toThrow(/unknown/);
  });

  it("supports registering a new strategy without touching the existing ones", () => {
    const factory = new ExtractorFactory();

    factory.register("json", () => new FakeExtractor());

    expect(
      factory.getExtractor(buildTarget({ type: "json" as ScrapeTarget["type"] })),
    ).toBeInstanceOf(FakeExtractor);
    expect(factory.getExtractor(buildTarget({ type: "html" }))).toBeInstanceOf(CheerioExtractor);
  });
});
