import { describe, expect, it } from "vitest";
import { InvalidRateError } from "../errors/InvalidRateError.js";
import { RateValue } from "./RateValue.js";

describe("RateValue", () => {
  it.each(["36.5842", "36", "0.5", "100.00", "1"])(
    "accepts a valid positive decimal string: %s",
    (raw) => {
      const rate = RateValue.create(raw);

      expect(rate.toString()).toBe(raw);
    },
  );

  it("exposes the numeric value only via toNumber, for display purposes", () => {
    const rate = RateValue.create("36.5842");

    expect(rate.toNumber()).toBe(36.5842);
  });

  it.each([
    "36,58", // locale format (comma) is the scraper's responsibility, not the domain's
    "1.234,56",
    "0",
    "0.0",
    "-5",
    "-5.25",
    "36.",
    "abc",
    "",
    "   ",
    "36.58.13",
    "Infinity",
    "NaN",
  ])("rejects invalid or non-positive input: %j", (raw) => {
    expect(() => RateValue.create(raw)).toThrow(InvalidRateError);
  });

  it("considers two values with the same string equal", () => {
    const a = RateValue.create("36.5842");
    const b = RateValue.create("36.5842");

    expect(a.equals(b)).toBe(true);
  });

  it("considers two values with different strings not equal", () => {
    const a = RateValue.create("36.5842");
    const b = RateValue.create("36.5843");

    expect(a.equals(b)).toBe(false);
  });
});
