import { DomainError } from "./DomainError.js";

export class InvalidCurrencyError extends DomainError {
  constructor(raw: string) {
    super(
      `Invalid currency code: "${raw}". Expected a 3-letter ISO 4217 code (e.g. "USD").`,
      "INVALID_CURRENCY",
    );
  }
}
