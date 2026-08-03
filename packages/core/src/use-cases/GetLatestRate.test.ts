import { describe, expect, it } from "vitest";
import { ExchangeRate } from "../domain/entities/ExchangeRate.js";
import { InvalidCurrencyError } from "../domain/errors/InvalidCurrencyError.js";
import { RateNotFoundError } from "../domain/errors/RateNotFoundError.js";
import { CurrencyCode } from "../domain/value-objects/CurrencyCode.js";
import { RateValue } from "../domain/value-objects/RateValue.js";
import type { ExchangeRateRepository } from "../ports/ExchangeRateRepository.js";
import { GetLatestRate } from "./GetLatestRate.js";

const NOW = new Date("2026-08-02T12:00:00.000Z");

function buildRate(): ExchangeRate {
  return ExchangeRate.create(
    {
      currency: CurrencyCode.create("VES"),
      rate: RateValue.create("36.5842"),
      source: "bcv_oficial",
      extractedAt: new Date("2026-08-02T10:00:00.000Z"),
    },
    NOW,
  );
}

class FakeRepository implements ExchangeRateRepository {
  constructor(private readonly latest: ExchangeRate | null) {}

  async save(rate: ExchangeRate): Promise<ExchangeRate> {
    return rate;
  }

  async findLatest(): Promise<ExchangeRate | null> {
    return this.latest;
  }

  async findByDate(): Promise<ExchangeRate | null> {
    return null;
  }
}

class SpyRepository implements ExchangeRateRepository {
  receivedSource: string | undefined;

  async save(rate: ExchangeRate): Promise<ExchangeRate> {
    return rate;
  }

  async findLatest(_currency: CurrencyCode, source?: string): Promise<ExchangeRate | null> {
    this.receivedSource = source;
    return buildRate();
  }

  async findByDate(): Promise<ExchangeRate | null> {
    return null;
  }
}

describe("GetLatestRate", () => {
  it("returns the latest rate from the repository", async () => {
    const useCase = new GetLatestRate(new FakeRepository(buildRate()));

    const result = await useCase.execute("VES");

    expect(result.rate.toString()).toBe("36.5842");
  });

  it("throws RateNotFoundError when there is no data", async () => {
    const useCase = new GetLatestRate(new FakeRepository(null));

    await expect(useCase.execute("VES")).rejects.toThrow(RateNotFoundError);
  });

  it("validates the ISO code before querying the repository", async () => {
    const useCase = new GetLatestRate(new FakeRepository(null));

    await expect(useCase.execute("V3S")).rejects.toThrow(InvalidCurrencyError);
  });

  it("forwards the optional source filter to the repository", async () => {
    const repository = new SpyRepository();
    const useCase = new GetLatestRate(repository);

    await useCase.execute("VES", "bcv_oficial");

    expect(repository.receivedSource).toBe("bcv_oficial");
  });
});
