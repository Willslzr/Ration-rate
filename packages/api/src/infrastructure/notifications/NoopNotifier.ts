import type { NotificationChannel, NotificationFailurePayload } from "@ratio/core";
import type { Logger } from "../logging/Logger.js";
import { consoleLogger } from "../logging/Logger.js";

/** Used when no webhook channel is configured, so the app never crashes for lack of one. */
export class NoopNotifier implements NotificationChannel {
  constructor(private readonly logger: Logger = consoleLogger) {}

  async notifyFailure(payload: NotificationFailurePayload): Promise<void> {
    this.logger.warn(
      `[NoopNotifier] No notification channel configured — scrape failed for ${payload.isoCode} ` +
        `(source: ${payload.sourceName}): ${payload.errorMessage}`,
    );
  }
}
