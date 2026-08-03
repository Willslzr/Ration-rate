import type { NotificationFailurePayload } from "@ratio/core";
import type { Logger } from "../logging/Logger.js";
import type { WebhookFetchFn, WebhookRequest } from "./WebhookNotifier.js";
import { WebhookNotifier } from "./WebhookNotifier.js";

export class TelegramNotifier extends WebhookNotifier {
  constructor(
    private readonly botToken: string,
    private readonly chatId: string,
    fetchFn?: WebhookFetchFn,
    logger?: Logger,
  ) {
    super(fetchFn, logger);
  }

  protected buildRequest(payload: NotificationFailurePayload): WebhookRequest {
    return {
      url: `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      body: { chat_id: this.chatId, text: this.formatMessage(payload) },
    };
  }
}
