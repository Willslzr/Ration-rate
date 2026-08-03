import { Type } from "@sinclair/typebox";
import type { ServerInstance } from "./buildServer.js";

export const HealthResponseSchema = Type.Object({
  status: Type.Union([Type.Literal("ok"), Type.Literal("error")]),
  database: Type.Union([Type.Literal("ok"), Type.Literal("error")]),
});

export interface HealthRouteDeps {
  readonly checkDatabaseHealth: () => Promise<boolean>;
}

export function registerHealthRoute(app: ServerInstance, deps: HealthRouteDeps): void {
  app.get(
    "/health",
    { schema: { response: { 200: HealthResponseSchema, 503: HealthResponseSchema } } },
    async (_request, reply) => {
      const databaseOk = await deps.checkDatabaseHealth();
      const body = {
        status: databaseOk ? ("ok" as const) : ("error" as const),
        database: databaseOk ? ("ok" as const) : ("error" as const),
      };
      return reply.code(databaseOk ? 200 : 503).send(body);
    },
  );
}
