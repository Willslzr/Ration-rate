import { describe, expect, it } from "vitest";
import { ExchangeRate } from "../domain/entities/ExchangeRate.js";
import { InvalidDateError } from "../domain/errors/InvalidDateError.js";
import { RateNotFoundError } from "../domain/errors/RateNotFoundError.js";
import { CurrencyCode } from "../domain/value-objects/CurrencyCode.js";
import type { RateDate } from "../domain/value-objects/RateDate.js";
import { RateValue } from "../domain/value-objects/RateValue.js";
import type { ExchangeRateRepository } from "../ports/ExchangeRateRepository.js";
import { GetRateByDate } from "./GetRateByDate.js";

const NOW = new Date("2026-08-02T12:00:00.000Z");

function buildRate(): ExchangeRate {
  return ExchangeRate.create(
    {
      currency: CurrencyCode.create("VES"),
      rate: RateValue.create("36.5842"),
      source: "bcv_oficial",
      extractedAt: new Date("2026-04-14T10:00:00.000Z"),
    },
    NOW,
  );
}

class FakeRepository implements ExchangeRateRepository {
  constructor(private readonly result: ExchangeRate | null) {}

  async save(rate: ExchangeRate): Promise<ExchangeRate> {
    return rate;
  }

  async findLatest(): Promise<ExchangeRate | null> {
    return null;
  }

  async findByDate(): Promise<ExchangeRate | null> {
    return this.result;
  }
}

class SpyRepository implements ExchangeRateRepository {
  receivedSource: string | undefined;
  receivedDate: RateDate | undefined;

  async save(rate: ExchangeRate): Promise<ExchangeRate> {
    return rate;
  }

  async findLatest(): Promise<ExchangeRate | null> {
    return null;
  }

  async findByDate(
    _currency: CurrencyCode,
    date: RateDate,
    source?: string,
  ): Promise<ExchangeRate | null> {
    this.receivedDate = date;
    this.receivedSource = source;
    return buildRate();
  }
}

describe("GetRateByDate", () => {
  it("returns the rate for the given date", async () => {
    const useCase = new GetRateByDate(new FakeRepository(buildRate()));

    const result = await useCase.execute("VES", "2026-04-14");

    expect(result.rate.toString()).toBe("36.5842");
  });

  it("throws RateNotFoundError when there is no data for that date", async () => {
    const useCase = new GetRateByDate(new FakeRepository(null));

    await expect(useCase.execute("VES", "2026-04-14")).rejects.toThrow(RateNotFoundError);
  });

  it("validates the ISO code before querying the repository", async () => {
    const useCase = new GetRateByDate(new FakeRepository(null));

    await expect(useCase.execute("V3S", "2026-04-14")).rejects.toThrow();
  });

  it("validates the date format before querying the repository", async () => {
    const useCase = new GetRateByDate(new FakeRepository(null));

    await expect(useCase.execute("VES", "14/04/2026")).rejects.toThrow(InvalidDateError);
  });

  it("forwards the parsed date and the optional source filter to the repository", async () => {
    const repository = new SpyRepository();
    const useCase = new GetRateByDate(repository);

    await useCase.execute("VES", "2026-04-14", "bcv_oficial");

    expect(repository.receivedDate?.toString()).toBe("2026-04-14T00:00:00.000Z");
    expect(repository.receivedSource).toBe("bcv_oficial");
  });
});
