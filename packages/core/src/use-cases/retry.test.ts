import { describe, expect, it, vi } from "vitest";
import { retry } from "./retry.js";

describe("retry", () => {
  it("returns the result on the first successful attempt without delaying", async () => {
    const delayFn = vi.fn(async () => {});
    const fn = vi.fn(async () => "ok");

    const result = await retry(fn, { delayFn });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(delayFn).not.toHaveBeenCalled();
  });

  it("recovers on the 2nd attempt", async () => {
    const delays: number[] = [];
    const delayFn = async (ms: number): Promise<void> => {
      delays.push(ms);
    };
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error("temporary failure");
      }
      return "recovered";
    });

    const result = await retry(fn, { delayFn, randomFn: () => 0 });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([1000]);
  });

  it("throws the last error after exhausting all attempts, without delaying after the last one", async () => {
    const delayFn = vi.fn(async () => {});
    const failure = new Error("permanent failure");
    const fn = vi.fn(async () => {
      throw failure;
    });

    await expect(retry(fn, { delayFn, randomFn: () => 0 })).rejects.toBe(failure);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(delayFn).toHaveBeenCalledTimes(2);
  });

  it("applies exponential backoff with jitter for each retry", async () => {
    const delays: number[] = [];
    const delayFn = async (ms: number): Promise<void> => {
      delays.push(ms);
    };
    const fn = vi.fn(async () => {
      throw new Error("fail");
    });

    await expect(retry(fn, { delayFn, randomFn: () => 0.5, maxAttempts: 3 })).rejects.toThrow(
      "fail",
    );

    expect(delays).toEqual([1500, 2500]);
  });

  it("respects a custom maxAttempts and baseDelayMs", async () => {
    const delayFn = vi.fn(async () => {});
    const fn = vi.fn(async () => {
      throw new Error("fail");
    });

    await expect(
      retry(fn, { delayFn, randomFn: () => 0, maxAttempts: 5, baseDelayMs: 100 }),
    ).rejects.toThrow("fail");

    expect(fn).toHaveBeenCalledTimes(5);
    expect(delayFn).toHaveBeenCalledTimes(4);
  });
});
