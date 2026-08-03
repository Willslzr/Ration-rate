import type { Clock } from "@ratio/core";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
