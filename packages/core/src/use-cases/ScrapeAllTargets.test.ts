import { describe, expect, it } from "vitest";
import { ExchangeRate } from "../domain/entities/ExchangeRate.js";
import { ScrapeFailedError } from "../domain/errors/ScrapeFailedError.js";
import { RateValue } from "../domain/value-objects/RateValue.js";
import type { Clock } from "../ports/Clock.js";
import type { ExchangeRateRepository } from "../ports/ExchangeRateRepository.js";
import type {
  NotificationChannel,
  NotificationFailurePayload,
} from "../ports/NotificationChannel.js";
import type { RateExtractor } from "../ports/RateExtractor.js";
import type { ScrapeTarget } from "../ports/ScrapeTarget.js";
import { ScrapeAllTargets } from "./ScrapeAllTargets.js";

const NOW = new Date("2026-08-02T12:00:00.000Z");
const NO_DELAY = { delayFn: async (): Promise<void> => {}, randomFn: (): number => 0 };

class FixedClock implements Clock {
  now(): Date {
    return NOW;
  }
}

class RecordingRepository implements ExchangeRateRepository {
  readonly saved: ExchangeRate[] = [];

  async save(rate: ExchangeRate): Promise<ExchangeRate> {
    this.saved.push(rate);
    return rate;
  }

  async findLatest(): Promise<ExchangeRate | null> {
    return null;
  }

  async findByDate(): Promise<ExchangeRate | null> {
    return null;
  }
}

class RecordingNotifier implements NotificationChannel {
  readonly notifications: NotificationFailurePayload[] = [];

  async notifyFailure(payload: NotificationFailurePayload): Promise<void> {
    this.notifications.push(payload);
  }
}

function buildTarget(overrides: Partial<ScrapeTarget> = {}): ScrapeTarget {
  return {
    isoCode: "VES",
    sourceName: "bcv_oficial",
    url: "https://www.bcv.org.ve",
    type: "html",
    selector: "#dolar .centrado strong",
    active: true,
    ...overrides,
  };
}

describe("ScrapeAllTargets", () => {
  it("persists a rate when extraction succeeds on the first attempt", async () => {
    const repository = new RecordingRepository();
    const notifier = new RecordingNotifier();
    const extractor: RateExtractor = {
      extract: async () => RateValue.create("36.5842"),
    };
    const useCase = new ScrapeAllTargets({
      repository,
      extractor,
      notifier,
      clock: new FixedClock(),
    });

    const summary = await useCase.execute([buildTarget()]);

    expect(summary).toEqual({ succeeded: ["bcv_oficial"], failed: [] });
    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0]?.rate.toString()).toBe("36.5842");
    expect(notifier.notifications).toHaveLength(0);
  });

  it("recovers when extraction fails once and succeeds on the 2nd attempt", async () => {
    const repository = new RecordingRepository();
    const notifier = new RecordingNotifier();
    let calls = 0;
    const extractor: RateExtractor = {
      extract: async () => {
        calls += 1;
        if (calls < 2) {
          throw new ScrapeFailedError("temporary network error");
        }
        return RateValue.create("36.5842");
      },
    };
    const useCase = new ScrapeAllTargets(
      { repository, extractor, notifier, clock: new FixedClock() },
      NO_DELAY,
    );

    const summary = await useCase.execute([buildTarget()]);

    expect(summary).toEqual({ succeeded: ["bcv_oficial"], failed: [] });
    expect(calls).toBe(2);
    expect(notifier.notifications).toHaveLength(0);
  });

  it("notifies and continues with the rest when a target fails definitively", async () => {
    const repository = new RecordingRepository();
    const notifier = new RecordingNotifier();
    const extractor: RateExtractor = {
      extract: async (target) => {
        if (target.sourceName === "bcv_oficial") {
          throw new ScrapeFailedError("selector not found");
        }
        return RateValue.create("890.12");
      },
    };
    const useCase = new ScrapeAllTargets(
      { repository, extractor, notifier, clock: new FixedClock() },
      NO_DELAY,
    );

    const summary = await useCase.execute([
      buildTarget({ sourceName: "bcv_oficial" }),
      buildTarget({ sourceName: "paralelo", url: "https://example.com/paralelo" }),
    ]);

    expect(summary.succeeded).toEqual(["paralelo"]);
    expect(summary.failed).toEqual(["bcv_oficial"]);
    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0]?.source).toBe("paralelo");
    expect(notifier.notifications).toHaveLength(1);
    expect(notifier.notifications[0]).toMatchObject({
      sourceName: "bcv_oficial",
      isoCode: "VES",
      errorMessage: "selector not found",
    });
  });

  it("swallows notifier errors so the run keeps going", async () => {
    const repository = new RecordingRepository();
    const extractor: RateExtractor = {
      extract: async () => {
        throw new ScrapeFailedError("boom");
      },
    };
    const brokenNotifier: NotificationChannel = {
      notifyFailure: async () => {
        throw new Error("webhook down");
      },
    };
    const useCase = new ScrapeAllTargets(
      { repository, extractor, notifier: brokenNotifier, clock: new FixedClock() },
      NO_DELAY,
    );

    const summary = await useCase.execute([buildTarget()]);

    expect(summary).toEqual({ succeeded: [], failed: ["bcv_oficial"] });
  });
});
