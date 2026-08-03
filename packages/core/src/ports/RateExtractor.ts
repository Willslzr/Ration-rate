import type { RateValue } from "../domain/value-objects/RateValue.js";
import type { ScrapeTarget } from "./ScrapeTarget.js";

export interface RateExtractor {
  /** Throws ScrapeFailedError when extraction ultimately fails. */
  extract(target: ScrapeTarget): Promise<RateValue>;
}
