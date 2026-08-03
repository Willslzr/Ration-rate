import { describe, expect, it } from "vitest";
import { targets } from "./targets.config.js";

describe("targets.config", () => {
  it("includes the real, active BCV oficial target", () => {
    const bcv = targets.find((target) => target.sourceName === "bcv_oficial");

    expect(bcv).toBeDefined();
    expect(bcv?.active).toBe(true);
    expect(bcv?.isoCode).toBe("VES");
  });

  it("configures a target for every supported currency and source", () => {
    const bySource = (isoCode: string, sourceName: string) =>
      targets.find((target) => target.isoCode === isoCode && target.sourceName === sourceName);

    expect(bySource("VES", "bcv_oficial")).toBeDefined();
    expect(bySource("VES", "paralelo")).toBeDefined();
    expect(bySource("ARS", "oficial")).toBeDefined();
    expect(bySource("ARS", "paralelo")).toBeDefined();
    expect(bySource("EUR", "oficial")).toBeDefined();
    expect(bySource("COP", "oficial")).toBeDefined();
  });

  it("has every configured target active", () => {
    expect(targets.every((target) => target.active)).toBe(true);
  });

  it("uses the html strategy for every target (none require a real browser yet)", () => {
    expect(targets.every((target) => target.type === "html")).toBe(true);
  });
});
