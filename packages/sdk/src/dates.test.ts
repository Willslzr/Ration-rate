import { describe, expect, it } from "vitest";
import { parseRationDate } from "./dates.js";
import { InvalidDateError } from "./errors.js";

describe("parseRationDate", () => {
  describe("YYYY-MM-DD format", () => {
    it("returns the same normalized string for a valid ISO date", () => {
      expect(parseRationDate("2026-04-14")).toBe("2026-04-14");
    });

    it("rejects a non-existent calendar date", () => {
      expect(() => parseRationDate("2026-02-31")).toThrow(InvalidDateError);
    });
  });

  describe("DD/MM/YYYY format", () => {
    it("normalizes to YYYY-MM-DD", () => {
      expect(parseRationDate("14/04/2026")).toBe("2026-04-14");
    });

    it("rejects a non-existent calendar date (31/02/2026)", () => {
      expect(() => parseRationDate("31/02/2026")).toThrow(InvalidDateError);
    });

    it("rejects month 13", () => {
      expect(() => parseRationDate("01/13/2026")).toThrow(InvalidDateError);
    });

    it("rejects day 00", () => {
      expect(() => parseRationDate("00/04/2026")).toThrow(InvalidDateError);
    });
  });

  describe("Date object", () => {
    it("normalizes using UTC components", () => {
      expect(parseRationDate(new Date("2026-04-14T23:30:00.000Z"))).toBe("2026-04-14");
    });

    it("rejects an invalid Date object", () => {
      expect(() => parseRationDate(new Date("not-a-date"))).toThrow(InvalidDateError);
    });
  });

  describe("invalid formats", () => {
    it.each(["2026/04/14", "14-04-2026", "not-a-date", "", "2026-4-14", "04/14/2026-extra"])(
      "rejects %j",
      (raw) => {
        expect(() => parseRationDate(raw)).toThrow(InvalidDateError);
      },
    );
  });
});
