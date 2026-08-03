import { describe, expect, it } from "vitest";
import { targets } from "./targets.config.js";

describe("targets.config", () => {
  it("includes the real, active BCV oficial target", () => {
    const bcv = targets.find((target) => target.sourceName === "bcv_oficial");

    expect(bcv).toBeDefined();
    expect(bcv?.active).toBe(true);
    expect(bcv?.isoCode).toBe("VES");
  });

  it("includes at least one inactive example target", () => {
    expect(targets.some((target) => !target.active)).toBe(true);
  });
});
