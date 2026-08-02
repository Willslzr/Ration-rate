import { InvalidDateError } from "../errors/InvalidDateError.js";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class RateDate {
  private constructor(private readonly value: Date) {}

  static fromDate(date: Date, now: Date = new Date()): RateDate {
    if (Number.isNaN(date.getTime())) {
      throw new InvalidDateError("Invalid date: the provided Date object is not valid.");
    }
    if (date.getTime() > now.getTime()) {
      throw new InvalidDateError(`Date cannot be in the future: ${date.toISOString()}`);
    }
    return new RateDate(date);
  }

  static fromIsoString(raw: string, now: Date = new Date()): RateDate {
    if (!ISO_DATE_PATTERN.test(raw)) {
      throw new InvalidDateError(`Invalid ISO date string: "${raw}". Expected format YYYY-MM-DD.`);
    }
    const date = new Date(`${raw}T00:00:00.000Z`);
    const roundTrips = !Number.isNaN(date.getTime()) && date.toISOString().startsWith(raw);
    if (!roundTrips) {
      throw new InvalidDateError(`Invalid calendar date: "${raw}".`);
    }
    return RateDate.fromDate(date, now);
  }

  toDate(): Date {
    return new Date(this.value.getTime());
  }

  equals(other: RateDate): boolean {
    return this.value.getTime() === other.value.getTime();
  }

  toString(): string {
    return this.value.toISOString();
  }
}
