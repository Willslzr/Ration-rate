import { InvalidCurrencyError, InvalidDateError, RateNotFoundError } from "@ratio/core";
import type { FastifyError } from "fastify";
import type { ServerInstance } from "./buildServer.js";
import { RateLimitExceededError, UnauthorizedError } from "./httpErrors.js";

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly correlationId: string;
  readonly code: string;
}

interface ResolvedProblem {
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly code: string;
}

function isValidationError(error: unknown): error is FastifyError {
  return (
    typeof error === "object" &&
    error !== null &&
    "validation" in error &&
    Array.isArray((error as FastifyError).validation)
  );
}

function resolveProblem(error: unknown): ResolvedProblem {
  if (error instanceof InvalidCurrencyError || error instanceof InvalidDateError) {
    return { status: 400, title: "Bad Request", detail: error.message, code: error.code };
  }
  if (error instanceof RateNotFoundError) {
    return { status: 404, title: "Not Found", detail: error.message, code: error.code };
  }
  if (error instanceof UnauthorizedError) {
    return { status: 401, title: "Unauthorized", detail: error.message, code: error.code };
  }
  if (error instanceof RateLimitExceededError) {
    return { status: 429, title: "Too Many Requests", detail: error.message, code: error.code };
  }
  if (isValidationError(error)) {
    return {
      status: 400,
      title: "Bad Request",
      detail: error.message,
      code: "VALIDATION_ERROR",
    };
  }
  return {
    status: 500,
    title: "Internal Server Error",
    detail: "An unexpected error occurred.",
    code: "INTERNAL_ERROR",
  };
}

/**
 * Maps every thrown error to an RFC 9457 Problem Details response. 500s never
 * leak internal error details in the body — only the correlationId (the
 * request id), which is also present in the server log line for that request.
 */
export function registerErrorHandler(app: ServerInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const problem = resolveProblem(error);

    if (problem.status >= 500) {
      request.log.error({ err: error }, "Unhandled error");
    }

    const body: ProblemDetails = {
      type: "about:blank",
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      correlationId: request.id,
      code: problem.code,
    };

    reply.code(problem.status).type("application/problem+json").send(body);
  });
}
