import type { NotificationChannel, NotificationFailurePayload } from "@ratio/core";
import type { Logger } from "../logging/Logger.js";
import { consoleLogger } from "../logging/Logger.js";

export type WebhookFetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<Response>;

const defaultFetch: WebhookFetchFn = (url, init) => fetch(url, init);

export interface WebhookRequest {
  readonly url: string;
  readonly body: unknown;
}

/**
 * Shared webhook-delivery mechanics for NotificationChannel adapters: a failure
 * to deliver (network error or non-2xx response) is logged and swallowed, so a
 * broken webhook never breaks the scraping flow. Subclasses only decide the
 * destination URL and payload shape.
 */
export abstract class WebhookNotifier implements NotificationChannel {
  protected constructor(
    private readonly fetchFn: WebhookFetchFn = defaultFetch,
    private readonly logger: Logger = consoleLogger,
  ) {}

  async notifyFailure(payload: NotificationFailurePayload): Promise<void> {
    const { url, body } = this.buildRequest(payload);
    try {
      const response = await this.fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        this.logger.warn(
          `${this.constructor.name}: webhook responded with HTTP ${response.status}.`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `${this.constructor.name}: failed to deliver notification: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  protected formatMessage(payload: NotificationFailurePayload): string {
    return (
      `Scrape failed for ${payload.isoCode} (source: ${payload.sourceName})\n` +
      `URL: ${payload.url}\n` +
      `Error: ${payload.errorMessage}\n` +
      `At: ${payload.occurredAt.toISOString()}`
    );
  }

  protected abstract buildRequest(payload: NotificationFailurePayload): WebhookRequest;
}
