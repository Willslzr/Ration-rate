import { InvalidRateError } from "../errors/InvalidRateError.js";

const POSITIVE_DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

export class RateValue {
  private constructor(private readonly value: string) {}

  static create(raw: string): RateValue {
    if (!POSITIVE_DECIMAL_PATTERN.test(raw) || Number(raw) <= 0) {
      throw new InvalidRateError(raw);
    }
    return new RateValue(raw);
  }

  /** Solo para display; nunca usar en cálculos de dominio (riesgo de precisión de punto flotante). */
  toNumber(): number {
    return Number(this.value);
  }

  equals(other: RateValue): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
