import { describe, expect, it } from "vitest";
import { DomainError } from "../domain/errors/DomainError.js";
import { InvalidCurrencyError } from "../domain/errors/InvalidCurrencyError.js";
import type { ScrapeTarget } from "./ScrapeTarget.js";
import { validateTargets } from "./ScrapeTarget.js";

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

describe("validateTargets", () => {
  it("accepts a list of well-formed targets", () => {
    expect(() =>
      validateTargets([buildTarget(), buildTarget({ sourceName: "paralelo", active: false })]),
    ).not.toThrow();
  });

  it("accepts an empty list", () => {
    expect(() => validateTargets([])).not.toThrow();
  });

  it("rejects an unknown/malformed ISO code", () => {
    expect(() => validateTargets([buildTarget({ isoCode: "V3S" })])).toThrow(InvalidCurrencyError);
  });

  it("rejects an empty sourceName", () => {
    expect(() => validateTargets([buildTarget({ sourceName: "  " })])).toThrow(DomainError);
  });

  it("rejects a malformed url", () => {
    expect(() => validateTargets([buildTarget({ url: "not-a-url" })])).toThrow(DomainError);
  });

  it.each(["pdf", "json", ""])("rejects an invalid type: %j", (type) => {
    expect(() => validateTargets([buildTarget({ type: type as ScrapeTarget["type"] })])).toThrow(
      DomainError,
    );
  });

  it("rejects an empty selector", () => {
    expect(() => validateTargets([buildTarget({ selector: "   " })])).toThrow(DomainError);
  });

  it("rejects a non-boolean active flag", () => {
    expect(() => validateTargets([buildTarget({ active: "yes" as unknown as boolean })])).toThrow(
      DomainError,
    );
  });

  it("fails fast on the first invalid target without checking the rest", () => {
    const targets = [buildTarget({ isoCode: "XXX9" }), buildTarget({ sourceName: "" })];

    expect(() => validateTargets(targets)).toThrow(InvalidCurrencyError);
  });
});
