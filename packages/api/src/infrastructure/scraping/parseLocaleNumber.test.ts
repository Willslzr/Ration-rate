import { ScrapeFailedError } from "@ratio/core";
import { describe, expect, it } from "vitest";
import { parseLocaleNumber } from "./parseLocaleNumber.js";

describe("parseLocaleNumber", () => {
  it.each([
    ["36,58", "36.58"],
    ["1.234,56", "1234.56"],
    ["36.58", "36.58"],
    ["1,234.56", "1234.56"],
    ["36.5842", "36.5842"],
    ["1.234.567", "1234567"],
    ["1,234,567", "1234567"],
    ["1.234.567,89", "1234567.89"],
    ["1,234,567.89", "1234567.89"],
    ["5", "5"],
    ["100", "100"],
    ["Bs. 36,58", "36.58"],
    ["$36.58", "36.58"],
    ["€36,58", "36.58"],
    ["USD 36.58", "36.58"],
    ["  36,58  ", "36.58"],
    ["36,58 Bs.", "36.58"],
    ["Tasa oficial: 36,5842 Bs.", "36.5842"],
  ])("parses %j as %j", (raw, expected) => {
    expect(parseLocaleNumber(raw)).toBe(expected);
  });

  it.each(["", "   ", "N/A", "no data", "abc", "0", "0,00", "0.00", "..,,", "-"])(
    "rejects %j with ScrapeFailedError",
    (raw) => {
      expect(() => parseLocaleNumber(raw)).toThrow(ScrapeFailedError);
    },
  );

  it("picks the numeric token with the most digits when several are present", () => {
    expect(parseLocaleNumber("Actualizado 02/08/2026 - Tasa: 36,5842")).toBe("36.5842");
  });
});
