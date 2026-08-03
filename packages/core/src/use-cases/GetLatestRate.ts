import { RateNotFoundError } from "../domain/errors/RateNotFoundError.js";
import { CurrencyCode } from "../domain/value-objects/CurrencyCode.js";
import type { ExchangeRate } from "../domain/entities/ExchangeRate.js";
import type { ExchangeRateRepository } from "../ports/ExchangeRateRepository.js";

export class GetLatestRate {
  constructor(private readonly repository: ExchangeRateRepository) {}

  async execute(isoCode: string, source?: string): Promise<ExchangeRate> {
    const currency = CurrencyCode.create(isoCode);
    const rate = await this.repository.findLatest(currency, source);
    if (!rate) {
      throw new RateNotFoundError(
        `No exchange rate found for "${currency.toString()}"${
          source ? ` from source "${source}"` : ""
        }.`,
      );
    }
    return rate;
  }
}
