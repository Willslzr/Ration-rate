import { ScrapeFailedError } from "@ratio/core";

const CANDIDATE_PATTERN = /\d[\d.,]*\d|\d/g;
const VALID_DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

/**
 * Extracts a decimal string from scraped price text: strips currency symbols and
 * surrounding text, then resolves comma/dot as decimal vs. thousands separator
 * (whichever separator appears last is treated as the decimal point).
 */
export function parseLocaleNumber(raw: string): string {
  const candidates = raw.match(CANDIDATE_PATTERN);
  if (!candidates) {
    throw new ScrapeFailedError(`Unable to find a number in: "${raw}"`);
  }

  const token = pickLongestToken(candidates);
  const normalized = normalizeSeparators(token);

  if (!VALID_DECIMAL_PATTERN.test(normalized) || Number(normalized) <= 0) {
    throw new ScrapeFailedError(`Unable to parse a valid decimal number from: "${raw}"`);
  }

  return normalized;
}

function pickLongestToken(candidates: readonly string[]): string {
  return candidates.reduce((longest, candidate) =>
    digitCount(candidate) > digitCount(longest) ? candidate : longest,
  );
}

function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

function normalizeSeparators(token: string): string {
  const lastComma = token.lastIndexOf(",");
  const lastDot = token.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    return lastComma > lastDot
      ? token.replace(/\./g, "").replace(",", ".")
      : token.replace(/,/g, "");
  }

  if (lastComma !== -1) {
    return isThousandsGroup(token, ",", lastComma)
      ? token.replace(/,/g, "")
      : token.replace(",", ".");
  }

  if (lastDot !== -1) {
    return isThousandsGroup(token, ".", lastDot) ? token.replace(/\./g, "") : token;
  }

  return token;
}

function isThousandsGroup(token: string, separator: string, lastIndex: number): boolean {
  const occurrences = token.split(separator).length - 1;
  const trailingDigits = token.length - lastIndex - 1;
  return occurrences > 1 || trailingDigits === 3;
}
