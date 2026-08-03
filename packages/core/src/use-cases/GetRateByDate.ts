import { RateNotFoundError } from "../domain/errors/RateNotFoundError.js";
import { CurrencyCode } from "../domain/value-objects/CurrencyCode.js";
import { RateDate } from "../domain/value-objects/RateDate.js";
import type { ExchangeRate } from "../domain/entities/ExchangeRate.js";
import type { ExchangeRateRepository } from "../ports/ExchangeRateRepository.js";

export class GetRateByDate {
  constructor(private readonly repository: ExchangeRateRepository) {}

  async execute(isoCode: string, date: string, source?: string): Promise<ExchangeRate> {
    const currency = CurrencyCode.create(isoCode);
    const rateDate = RateDate.fromIsoString(date);
    const rate = await this.repository.findByDate(currency, rateDate, source);
    if (!rate) {
      throw new RateNotFoundError(
        `No exchange rate found for "${currency.toString()}" on ${rateDate.toString()}${
          source ? ` from source "${source}"` : ""
        }.`,
      );
    }
    return rate;
  }
}
