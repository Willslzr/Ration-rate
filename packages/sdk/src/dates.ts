import { InvalidDateError } from "./errors.js";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DMY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Normalizes 'DD/MM/YYYY', 'YYYY-MM-DD', or a Date into a 'YYYY-MM-DD' string. */
export function parseRationDate(input: string | Date): string {
  if (input instanceof Date) {
    return fromDate(input);
  }

  const isoMatch = ISO_DATE_PATTERN.exec(input);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return fromComponents(Number(year), Number(month), Number(day), input);
  }

  const dmyMatch = DMY_DATE_PATTERN.exec(input);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return fromComponents(Number(year), Number(month), Number(day), input);
  }

  throw new InvalidDateError(
    `Invalid date: "${input}". Expected "DD/MM/YYYY", "YYYY-MM-DD", or a Date object.`,
  );
}

function fromDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new InvalidDateError("Invalid date: the provided Date object is not valid.");
  }
  return formatIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function fromComponents(year: number, month: number, day: number, raw: string): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const roundTrips =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

  if (!roundTrips) {
    throw new InvalidDateError(`Invalid calendar date: "${raw}".`);
  }

  return formatIso(year, month, day);
}

function formatIso(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
