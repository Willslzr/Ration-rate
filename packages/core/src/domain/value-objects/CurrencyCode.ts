import { InvalidCurrencyError } from "../errors/InvalidCurrencyError.js";

const ISO_4217_PATTERN = /^[A-Z]{3}$/;

export class CurrencyCode {
  private constructor(private readonly value: string) {}

  static create(raw: string): CurrencyCode {
    const normalized = raw.trim().toUpperCase();
    if (!ISO_4217_PATTERN.test(normalized)) {
      throw new InvalidCurrencyError(raw);
    }
    return new CurrencyCode(normalized);
  }

  equals(other: CurrencyCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
