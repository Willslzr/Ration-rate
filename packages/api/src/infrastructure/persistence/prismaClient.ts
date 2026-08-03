import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client.js";

// SQLite adapter for development (see the provider-switch comment in
// prisma/schema.prisma). Production would swap this for
// `@prisma/adapter-pg` with a PostgreSQL connection string.
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}
