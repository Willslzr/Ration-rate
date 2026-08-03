import { DomainError } from "@ratio/core";
import type { RateExtractor, RateValue, ScrapeTarget } from "@ratio/core";
import { CheerioExtractor } from "./CheerioExtractor.js";
import { PlaywrightExtractor } from "./PlaywrightExtractor.js";

export type ExtractorStrategy = () => RateExtractor;

const DEFAULT_STRATEGIES: Record<string, ExtractorStrategy> = {
  html: () => new CheerioExtractor(),
  spa: () => new PlaywrightExtractor(),
};

function hasDispose(
  value: RateExtractor,
): value is RateExtractor & { dispose: () => Promise<void> } {
  return typeof (value as { dispose?: unknown }).dispose === "function";
}

/**
 * Maps a ScrapeTarget's `type` to a RateExtractor strategy. Open to extension:
 * register() adds support for a new type without touching existing strategies.
 * Extractors are memoized per type so, e.g., every 'spa' target shares one
 * PlaywrightExtractor (and its lazily-launched browser) across a scraping run.
 *
 * Also implements RateExtractor itself, delegating to the right strategy per
 * target — this lets it be passed directly as ScrapeAllTargets' extractor.
 */
export class ExtractorFactory implements RateExtractor {
  private readonly strategies: Map<string, ExtractorStrategy>;
  private readonly instances = new Map<string, RateExtractor>();

  constructor(strategies: Record<string, ExtractorStrategy> = DEFAULT_STRATEGIES) {
    this.strategies = new Map(Object.entries(strategies));
  }

  register(type: string, strategy: ExtractorStrategy): void {
    this.strategies.set(type, strategy);
    this.instances.delete(type);
  }

  getExtractor(target: ScrapeTarget): RateExtractor {
    const cached = this.instances.get(target.type);
    if (cached) {
      return cached;
    }

    const strategy = this.strategies.get(target.type);
    if (!strategy) {
      throw new DomainError(
        `No extractor strategy registered for scrape target type "${target.type}".`,
        "UNKNOWN_SCRAPE_TARGET_TYPE",
      );
    }

    const instance = strategy();
    this.instances.set(target.type, instance);
    return instance;
  }

  async extract(target: ScrapeTarget): Promise<RateValue> {
    return this.getExtractor(target).extract(target);
  }

  /** Closes every disposable extractor instance (e.g. PlaywrightExtractor's browser). */
  async dispose(): Promise<void> {
    const instances = [...this.instances.values()];
    this.instances.clear();
    await Promise.all(instances.filter(hasDispose).map((instance) => instance.dispose()));
  }
}
