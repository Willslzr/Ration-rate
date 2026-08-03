import type { NotificationFailurePayload } from "@ratio/core";
import type { Logger } from "../logging/Logger.js";
import type { WebhookFetchFn, WebhookRequest } from "./WebhookNotifier.js";
import { WebhookNotifier } from "./WebhookNotifier.js";

export class DiscordNotifier extends WebhookNotifier {
  constructor(
    private readonly webhookUrl: string,
    fetchFn?: WebhookFetchFn,
    logger?: Logger,
  ) {
    super(fetchFn, logger);
  }

  protected buildRequest(payload: NotificationFailurePayload): WebhookRequest {
    return {
      url: this.webhookUrl,
      body: { content: this.formatMessage(payload) },
    };
  }
}
