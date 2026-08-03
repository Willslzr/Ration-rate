import type { NotificationChannel, NotificationFailurePayload } from "@ratio/core";

/** Fans a failure notification out to every configured channel; one channel failing never blocks the others. */
export class CompositeNotifier implements NotificationChannel {
  constructor(private readonly channels: readonly NotificationChannel[]) {}

  async notifyFailure(payload: NotificationFailurePayload): Promise<void> {
    await Promise.allSettled(this.channels.map((channel) => channel.notifyFailure(payload)));
  }
}
