import { DomainError } from "../errors/DomainError.js";
import { InvalidDateError } from "../errors/InvalidDateError.js";
import type { CurrencyCode } from "../value-objects/CurrencyCode.js";
import type { RateValue } from "../value-objects/RateValue.js";

export interface ExchangeRateProps {
  id?: number;
  currency: CurrencyCode;
  rate: RateValue;
  source: string;
  extractedAt: Date;
}

export class ExchangeRate {
  private constructor(
    private readonly _id: number | undefined,
    private readonly _currency: CurrencyCode,
    private readonly _rate: RateValue,
    private readonly _source: string,
    private readonly _extractedAt: Date,
  ) {}

  static create(props: ExchangeRateProps, now: Date = new Date()): ExchangeRate {
    const source = props.source.trim();
    if (source.length === 0) {
      throw new DomainError("Exchange rate source must not be empty.", "INVALID_SOURCE");
    }
    if (Number.isNaN(props.extractedAt.getTime())) {
      throw new InvalidDateError("Invalid extractedAt: the provided Date object is not valid.");
    }
    if (props.extractedAt.getTime() > now.getTime()) {
      throw new InvalidDateError(
        `extractedAt cannot be in the future: ${props.extractedAt.toISOString()}`,
      );
    }
    return new ExchangeRate(props.id, props.currency, props.rate, source, props.extractedAt);
  }

  get id(): number | undefined {
    return this._id;
  }

  get currency(): CurrencyCode {
    return this._currency;
  }

  get rate(): RateValue {
    return this._rate;
  }

  get source(): string {
    return this._source;
  }

  get extractedAt(): Date {
    return new Date(this._extractedAt.getTime());
  }
}
