/** Base class for every error the SDK throws — never a plain Error or a string. */
export class RationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RationError";
  }
}

export class InvalidDateError extends RationError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDateError";
  }
}

/** The API responded with a non-2xx status. `detail` comes from its Problem Details body. */
export class RationApiError extends RationError {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`Ration API error (${status}): ${detail}`);
    this.name = "RationApiError";
    this.status = status;
    this.detail = detail;
  }
}

export class RationTimeoutError extends RationError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Ration request timed out after ${timeoutMs}ms`);
    this.name = "RationTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class RationNetworkError extends RationError {
  constructor(message: string) {
    super(`Ration network error: ${message}`);
    this.name = "RationNetworkError";
  }
}
