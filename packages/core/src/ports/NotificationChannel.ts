export interface NotificationFailurePayload {
  readonly sourceName: string;
  readonly url: string;
  readonly isoCode: string;
  readonly errorMessage: string;
  readonly occurredAt: Date;
}

export interface NotificationChannel {
  notifyFailure(payload: NotificationFailurePayload): Promise<void>;
}
