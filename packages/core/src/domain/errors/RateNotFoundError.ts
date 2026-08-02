import { DomainError } from "./DomainError.js";

export class RateNotFoundError extends DomainError {
  constructor(message: string) {
    super(message, "RATE_NOT_FOUND");
  }
}
