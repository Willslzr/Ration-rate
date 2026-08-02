import { DomainError } from "./DomainError.js";

export class InvalidRateError extends DomainError {
  constructor(raw: string) {
    super(
      `Invalid rate value: "${raw}". Expected a positive decimal string (e.g. "36.5842").`,
      "INVALID_RATE",
    );
  }
}
