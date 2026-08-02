import { describe, expect, it } from "vitest";
import { DomainError } from "../errors/DomainError.js";
import { InvalidDateError } from "../errors/InvalidDateError.js";
import { CurrencyCode } from "../value-objects/CurrencyCode.js";
import { RateValue } from "../value-objects/RateValue.js";
import { ExchangeRate } from "./ExchangeRate.js";

const NOW = new Date("2026-08-02T12:00:00.000Z");

function validProps(overrides: Partial<Parameters<typeof ExchangeRate.create>[0]> = {}) {
  return {
    currency: CurrencyCode.create("VES"),
    rate: RateValue.create("36.5842"),
    source: "bcv_oficial",
    extractedAt: new Date("2026-08-02T10:00:00.000Z"),
    ...overrides,
  };
}

describe("ExchangeRate.create", () => {
  it("creates a valid exchange rate without an id", () => {
    const rate = ExchangeRate.create(validProps(), NOW);

    expect(rate.id).toBeUndefined();
    expect(rate.currency.toString()).toBe("VES");
    expect(rate.rate.toString()).toBe("36.5842");
    expect(rate.source).toBe("bcv_oficial");
    expect(rate.extractedAt.toISOString()).toBe("2026-08-02T10:00:00.000Z");
  });

  it("creates a valid exchange rate with an id once persisted", () => {
    const rate = ExchangeRate.create(validProps({ id: 42 }), NOW);

    expect(rate.id).toBe(42);
  });

  it("trims surrounding whitespace from the source", () => {
    const rate = ExchangeRate.create(validProps({ source: "  bcv_oficial  " }), NOW);

    expect(rate.source).toBe("bcv_oficial");
  });

  it.each(["", "   "])("rejects an empty source: %j", (source) => {
    expect(() => ExchangeRate.create(validProps({ source }), NOW)).toThrow(DomainError);
  });

  it("rejects an invalid extractedAt Date object", () => {
    expect(() =>
      ExchangeRate.create(validProps({ extractedAt: new Date("not-a-date") }), NOW),
    ).toThrow(InvalidDateError);
  });

  it("rejects a future extractedAt", () => {
    expect(() =>
      ExchangeRate.create(validProps({ extractedAt: new Date("2026-08-03T00:00:00.000Z") }), NOW),
    ).toThrow(InvalidDateError);
  });

  it("returns a defensive copy from the extractedAt getter", () => {
    const rate = ExchangeRate.create(validProps(), NOW);
    const mutated = rate.extractedAt;
    mutated.setUTCFullYear(1999);

    expect(rate.extractedAt.getUTCFullYear()).toBe(2026);
  });
});
