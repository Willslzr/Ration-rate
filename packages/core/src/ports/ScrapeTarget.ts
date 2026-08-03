import { DomainError } from "../domain/errors/DomainError.js";
import { CurrencyCode } from "../domain/value-objects/CurrencyCode.js";

export interface ScrapeTarget {
  readonly isoCode: string;
  readonly sourceName: string;
  readonly url: string;
  readonly type: "html" | "spa";
  readonly selector: string;
  readonly active: boolean;
}

const SCRAPE_TARGET_TYPES = new Set(["html", "spa"]);

function invalidTarget(label: string, message: string): DomainError {
  return new DomainError(`Scrape target "${label}": ${message}`, "INVALID_SCRAPE_TARGET");
}

export function validateTargets(targets: readonly ScrapeTarget[]): void {
  for (const [index, target] of targets.entries()) {
    const label = target.sourceName.trim().length > 0 ? target.sourceName : `#${index}`;

    // Throws InvalidCurrencyError for an unknown/malformed ISO 4217 code.
    CurrencyCode.create(target.isoCode);

    if (target.sourceName.trim().length === 0) {
      throw invalidTarget(label, "sourceName must not be empty.");
    }

    try {
      new URL(target.url);
    } catch {
      throw invalidTarget(label, `url is malformed: "${target.url}".`);
    }

    if (!SCRAPE_TARGET_TYPES.has(target.type)) {
      throw invalidTarget(label, `type must be "html" or "spa", got "${target.type}".`);
    }

    if (target.selector.trim().length === 0) {
      throw invalidTarget(label, "selector must not be empty.");
    }

    if (typeof target.active !== "boolean") {
      throw invalidTarget(label, "active must be a boolean.");
    }
  }
}
