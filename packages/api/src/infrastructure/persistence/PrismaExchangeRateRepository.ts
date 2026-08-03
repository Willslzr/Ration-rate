import { CurrencyCode, ExchangeRate, RateValue } from "@ratio/core";
import type { ExchangeRateRepository, RateDate } from "@ratio/core";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { ExchangeRateModel } from "../../generated/prisma/models.js";

function utcDayBounds(date: Date): { start: Date; end: Date } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return {
    start: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, day, 23, 59, 59, 999)),
  };
}

export class PrismaExchangeRateRepository implements ExchangeRateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(rate: ExchangeRate): Promise<ExchangeRate> {
    const created = await this.prisma.exchangeRate.create({
      data: {
        isoCode: rate.currency.toString(),
        rate: rate.rate.toString(),
        source: rate.source,
        extractedAt: rate.extractedAt,
      },
    });
    return this.toDomain(created);
  }

  async findLatest(currency: CurrencyCode, source?: string): Promise<ExchangeRate | null> {
    const row = await this.prisma.exchangeRate.findFirst({
      where: {
        isoCode: currency.toString(),
        ...(source ? { source } : {}),
      },
      orderBy: { extractedAt: "desc" },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByDate(
    currency: CurrencyCode,
    date: RateDate,
    source?: string,
  ): Promise<ExchangeRate | null> {
    const { start, end } = utcDayBounds(date.toDate());
    const row = await this.prisma.exchangeRate.findFirst({
      where: {
        isoCode: currency.toString(),
        extractedAt: { gte: start, lte: end },
        ...(source ? { source } : {}),
      },
      orderBy: { extractedAt: "desc" },
    });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: ExchangeRateModel): ExchangeRate {
    return ExchangeRate.create(
      {
        id: row.id,
        currency: CurrencyCode.create(row.isoCode),
        rate: RateValue.create(row.rate),
        source: row.source,
        extractedAt: row.extractedAt,
      },
      new Date(),
    );
  }
}
