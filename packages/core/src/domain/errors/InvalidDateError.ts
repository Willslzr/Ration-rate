import { DomainError } from "./DomainError.js";

export class InvalidDateError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_DATE");
  }
}
