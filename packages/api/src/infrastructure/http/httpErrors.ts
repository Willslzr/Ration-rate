/** HTTP-layer errors, not domain errors — mapped to Problem Details by the global error handler. */
export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED";

  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class RateLimitExceededError extends Error {
  readonly code = "RATE_LIMIT_EXCEEDED";
  readonly statusCode = 429;

  constructor(message: string) {
    super(message);
    this.name = "RateLimitExceededError";
  }
}
