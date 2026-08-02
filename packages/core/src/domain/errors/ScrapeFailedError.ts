import { DomainError } from "./DomainError.js";

export class ScrapeFailedError extends DomainError {
  constructor(message: string) {
    super(message, "SCRAPE_FAILED");
  }
}
