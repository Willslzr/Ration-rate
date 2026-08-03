export interface RetryOptions {
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly delayFn?: (ms: number) => Promise<void>;
  readonly randomFn?: () => number;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Exponential backoff (baseDelayMs * 2^n) plus jitter between failed attempts; no delay after the last one.
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const delayFn = options.delayFn ?? sleep;
  const randomFn = options.randomFn ?? Math.random;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      const backoff = baseDelayMs * 2 ** (attempt - 1);
      const jitter = randomFn() * baseDelayMs;
      await delayFn(backoff + jitter);
    }
  }

  throw lastError;
}
