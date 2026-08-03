import type { ExchangeRate } from "../domain/entities/ExchangeRate.js";
import type { CurrencyCode } from "../domain/value-objects/CurrencyCode.js";
import type { RateDate } from "../domain/value-objects/RateDate.js";

export interface ExchangeRateRepository {
  save(rate: ExchangeRate): Promise<ExchangeRate>;
  findLatest(currency: CurrencyCode, source?: string): Promise<ExchangeRate | null>;
  findByDate(currency: CurrencyCode, date: RateDate, source?: string): Promise<ExchangeRate | null>;
}
