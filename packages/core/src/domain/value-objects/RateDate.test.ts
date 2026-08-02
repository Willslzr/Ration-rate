import { describe, expect, it } from "vitest";
import { InvalidDateError } from "../errors/InvalidDateError.js";
import { RateDate } from "./RateDate.js";

const NOW = new Date("2026-08-02T12:00:00.000Z");

describe("RateDate.fromIsoString", () => {
  it("accepts a valid past ISO date", () => {
    const rateDate = RateDate.fromIsoString("2026-04-14", NOW);

    expect(rateDate.toString()).toBe("2026-04-14T00:00:00.000Z");
  });

  it("accepts today's date", () => {
    const rateDate = RateDate.fromIsoString("2026-08-02", NOW);

    expect(rateDate.toString()).toBe("2026-08-02T00:00:00.000Z");
  });

  it.each(["14/04/2026", "2026-4-14", "not-a-date", "", "2026/04/14", "2026-04-14T00:00:00Z"])(
    "rejects malformed input: %j",
    (raw) => {
      expect(() => RateDate.fromIsoString(raw, NOW)).toThrow(InvalidDateError);
    },
  );

  it("rejects a calendar date that does not exist", () => {
    expect(() => RateDate.fromIsoString("2026-02-30", NOW)).toThrow(InvalidDateError);
  });

  it("rejects a future date", () => {
    expect(() => RateDate.fromIsoString("2026-08-03", NOW)).toThrow(InvalidDateError);
  });
});

describe("RateDate.fromDate", () => {
  it("accepts a valid past Date", () => {
    const rateDate = RateDate.fromDate(new Date("2026-01-01T00:00:00.000Z"), NOW);

    expect(rateDate.toDate().toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("rejects an invalid Date object", () => {
    expect(() => RateDate.fromDate(new Date("not-a-date"), NOW)).toThrow(InvalidDateError);
  });

  it("rejects a future Date", () => {
    expect(() => RateDate.fromDate(new Date("2026-12-25T00:00:00.000Z"), NOW)).toThrow(
      InvalidDateError,
    );
  });
});

describe("RateDate equality and immutability", () => {
  it("considers two dates with the same instant equal", () => {
    const a = RateDate.fromIsoString("2026-04-14", NOW);
    const b = RateDate.fromIsoString("2026-04-14", NOW);

    expect(a.equals(b)).toBe(true);
  });

  it("considers two different dates not equal", () => {
    const a = RateDate.fromIsoString("2026-04-14", NOW);
    const b = RateDate.fromIsoString("2026-04-15", NOW);

    expect(a.equals(b)).toBe(false);
  });

  it("returns a defensive copy from toDate", () => {
    const rateDate = RateDate.fromIsoString("2026-04-14", NOW);
    const mutated = rateDate.toDate();
    mutated.setUTCFullYear(1999);

    expect(rateDate.toDate().getUTCFullYear()).toBe(2026);
  });
});
