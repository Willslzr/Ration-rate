import { timingSafeEqual } from "node:crypto";
import type { ServerInstance } from "./buildServer.js";
import { UnauthorizedError } from "./httpErrors.js";

export interface ApiKeyAuthOptions {
  readonly apiKeys: readonly string[];
}

function isValidApiKey(received: string, validKeys: readonly string[]): boolean {
  const receivedBuffer = Buffer.from(received, "utf8");
  return validKeys.some((key) => {
    const keyBuffer = Buffer.from(key, "utf8");
    return keyBuffer.length === receivedBuffer.length && timingSafeEqual(receivedBuffer, keyBuffer);
  });
}

/**
 * Registers an onRequest hook requiring a valid x-api-key header. Meant to be
 * registered on an encapsulated child instance so it only applies to the
 * routes registered within that scope (e.g. /v1/rates/*, never /health).
 * The received key is never logged, valid or not.
 */
export function registerApiKeyAuth(app: ServerInstance, options: ApiKeyAuthOptions): void {
  app.addHook("onRequest", async (request) => {
    const header = request.headers["x-api-key"];
    const apiKey = Array.isArray(header) ? header[0] : header;

    if (!apiKey || !isValidApiKey(apiKey, options.apiKeys)) {
      throw new UnauthorizedError("Missing or invalid API key.");
    }
  });
}
