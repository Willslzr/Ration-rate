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
