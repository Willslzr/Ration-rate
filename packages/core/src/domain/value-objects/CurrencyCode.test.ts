import { describe, expect, it } from "vitest";
import { InvalidCurrencyError } from "../errors/InvalidCurrencyError.js";
import { CurrencyCode } from "./CurrencyCode.js";

describe("CurrencyCode", () => {
  it("accepts an already-uppercase 3-letter code", () => {
    const currency = CurrencyCode.create("USD");

    expect(currency.toString()).toBe("USD");
  });

  it("normalizes lowercase input to uppercase", () => {
    const currency = CurrencyCode.create("usd");

    expect(currency.toString()).toBe("USD");
  });

  it("trims surrounding whitespace", () => {
    const currency = CurrencyCode.create("  ves  ");

    expect(currency.toString()).toBe("VES");
  });

  it.each(["US", "USDD", "US1", "12A", "", "   ", "US-"])("rejects invalid format: %j", (raw) => {
    expect(() => CurrencyCode.create(raw)).toThrow(InvalidCurrencyError);
  });

  it("considers two codes with the same value equal", () => {
    const a = CurrencyCode.create("ARS");
    const b = CurrencyCode.create("ars");

    expect(a.equals(b)).toBe(true);
  });

  it("considers two codes with different values not equal", () => {
    const a = CurrencyCode.create("ARS");
    const b = CurrencyCode.create("VES");

    expect(a.equals(b)).toBe(false);
  });
});
