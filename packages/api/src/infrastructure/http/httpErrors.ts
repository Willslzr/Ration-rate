/** HTTP-layer errors, not domain errors — mapped to Problem Details by the global error handler. */
export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED";

  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}
