import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\//i;

/** Pure URL-scheme check, kept separate from client construction so it's testable
 * independently of whichever provider the generated client currently targets. */
export function isPostgresUrl(databaseUrl: string): boolean {
  return POSTGRES_URL_PATTERN.test(databaseUrl);
}

/**
 * Picks the driver adapter from the DATABASE_URL scheme: "file:" for SQLite
 * (local dev + tests, see prisma/schema.prisma) or "postgres(ql)://" for
 * PostgreSQL (Docker/production, see prisma/postgresql/schema.prisma).
 *
 * The generated client itself is provider-locked at `prisma generate` time —
 * it must have been produced from the schema matching the adapter chosen
 * here, or Prisma throws PrismaClientInitializationError immediately. Each
 * deployment context (local dev vs. the Docker image) generates the matching
 * variant before running; see each schema file's header comment.
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = isPostgresUrl(databaseUrl)
    ? new PrismaPg(databaseUrl)
    : new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}
