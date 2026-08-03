import { ExchangeRate } from "../domain/entities/ExchangeRate.js";
import { CurrencyCode } from "../domain/value-objects/CurrencyCode.js";
import type { Clock } from "../ports/Clock.js";
import type { ExchangeRateRepository } from "../ports/ExchangeRateRepository.js";
import type { NotificationChannel } from "../ports/NotificationChannel.js";
import type { RateExtractor } from "../ports/RateExtractor.js";
import type { ScrapeTarget } from "../ports/ScrapeTarget.js";
import { retry } from "./retry.js";
import type { RetryOptions } from "./retry.js";

export interface ScrapeAllTargetsDependencies {
  readonly repository: ExchangeRateRepository;
  readonly extractor: RateExtractor;
  readonly notifier: NotificationChannel;
  readonly clock: Clock;
}

export interface ScrapeSummary {
  readonly succeeded: readonly string[];
  readonly failed: readonly string[];
}

export class ScrapeAllTargets {
  constructor(
    private readonly deps: ScrapeAllTargetsDependencies,
    private readonly retryOptions: RetryOptions = {},
  ) {}

  async execute(targets: readonly ScrapeTarget[]): Promise<ScrapeSummary> {
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const target of targets) {
      try {
        const rateValue = await retry(() => this.deps.extractor.extract(target), this.retryOptions);
        const extractedAt = this.deps.clock.now();
        const exchangeRate = ExchangeRate.create(
          {
            currency: CurrencyCode.create(target.isoCode),
            rate: rateValue,
            source: target.sourceName,
            extractedAt,
          },
          extractedAt,
        );
        await this.deps.repository.save(exchangeRate);
        succeeded.push(target.sourceName);
      } catch (error) {
        failed.push(target.sourceName);
        await this.notifyFailure(target, error);
      }
    }

    return { succeeded, failed };
  }

  private async notifyFailure(target: ScrapeTarget, error: unknown): Promise<void> {
    try {
      await this.deps.notifier.notifyFailure({
        sourceName: target.sourceName,
        url: target.url,
        isoCode: target.isoCode,
        errorMessage: error instanceof Error ? error.message : String(error),
        occurredAt: this.deps.clock.now(),
      });
    } catch {
      // A broken notification channel must never stop the rest of the run.
    }
  }
}
