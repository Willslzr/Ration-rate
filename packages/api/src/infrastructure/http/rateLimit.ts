import rateLimit from "@fastify/rate-limit";
import type { FastifyRequest } from "fastify";
import type { ServerInstance } from "./buildServer.js";
import { RateLimitExceededError } from "./httpErrors.js";

export interface RateLimitOptions {
  readonly max?: number;
}

const DEFAULT_MAX = 100;

function resolveKey(request: FastifyRequest): string {
  const header = request.headers["x-api-key"];
  const apiKey = Array.isArray(header) ? header[0] : header;
  return apiKey && apiKey.length > 0 ? apiKey : request.ip;
}

/**
 * Registers @fastify/rate-limit globally: RATE_LIMIT_MAX requests per minute,
 * keyed by the x-api-key header when present, falling back to the client IP
 * (e.g. for /health, which has no API key). 429s carry a Retry-After header
 * (set by the plugin itself) and flow through the global error handler as
 * Problem Details, via RateLimitExceededError.
 */
export function registerRateLimit(app: ServerInstance, options: RateLimitOptions = {}): void {
  app.register(rateLimit, {
    max: options.max ?? DEFAULT_MAX,
    timeWindow: "1 minute",
    keyGenerator: resolveKey,
    errorResponseBuilder: (_request, context) =>
      new RateLimitExceededError(`Rate limit exceeded, retry in ${context.after}.`),
  });
}
