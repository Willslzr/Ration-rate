import { randomUUID } from "node:crypto";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

export type NodeEnv = "development" | "test" | "production";

export interface BuildServerDeps {
  readonly nodeEnv?: NodeEnv;
}

function resolveLogLevel(nodeEnv: NodeEnv | undefined): string {
  switch (nodeEnv) {
    case "production":
      return "info";
    case "test":
      return "silent";
    default:
      return "debug";
  }
}

/**
 * Builds a fully configured Fastify instance with no global state, so tests
 * can use fastify.inject() against a freshly built instance without binding
 * a real port.
 */
export function buildServer(deps: BuildServerDeps = {}): FastifyInstance {
  const app = Fastify({
    logger: { level: resolveLogLevel(deps.nodeEnv) },
    genReqId: () => randomUUID(),
  }).withTypeProvider<TypeBoxTypeProvider>();

  return app;
}
