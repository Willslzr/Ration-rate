import { parse as parsePgConnectionString } from "pg-connection-string";
import { describe, expect, it } from "vitest";
import { createPrismaClient, isPostgresUrl } from "./prismaClient.js";

describe("isPostgresUrl", () => {
  it.each(["postgresql://user:pass@localhost:5432/db", "postgres://user:pass@localhost/db"])(
    "recognizes %j as a Postgres URL",
    (url) => {
      expect(isPostgresUrl(url)).toBe(true);
    },
  );

  it.each(["file:./dev.db", "file:test.db"])("does not recognize %j as a Postgres URL", (url) => {
    expect(isPostgresUrl(url)).toBe(false);
  });
});

describe("createPrismaClient", () => {
  // The generated client is provider-locked at `prisma generate` time (see
  // prismaClient.ts's doc comment), and this repo's checked-in generated
  // client always targets whichever schema was generated last locally —
  // SQLite by default (packages/api/prisma/schema.prisma). So only the
  // SQLite branch is safe to construct here without a live database; the
  // Postgres branch is verified against a real PostgreSQL instance
  // (packages/api/prisma/postgresql/schema.prisma + a temporary container)
  // rather than duplicated as a brittle, generated-client-dependent unit test.
  it("builds a client for a file: (SQLite) URL without connecting", () => {
    expect(() => createPrismaClient("file:./does-not-need-to-exist.db")).not.toThrow();
  });
});

describe("Postgres connection string SSL handling (Neon requires TLS)", () => {
  // createPrismaClient() passes the DATABASE_URL straight through to `pg`
  // (via @prisma/adapter-pg's PrismaPg), which resolves it with
  // pg-connection-string — we don't parse or configure TLS ourselves. This
  // pins down exactly what that resolution does with `sslmode=require` (what
  // Neon's own connection strings include by default), so a future `pg` /
  // pg-connection-string upgrade that silently changes this can't break
  // Neon connectivity without a test failing here first.
  it("enables TLS for a Neon-style URL with sslmode=require", () => {
    const config = parsePgConnectionString(
      "postgresql://user:pass@ep-example-123.us-east-2.aws.neon.tech/ratio?sslmode=require",
    );

    expect(config.ssl).toBeTruthy();
  });

  it("leaves TLS unconfigured for a local URL without sslmode (docker-compose Postgres)", () => {
    const config = parsePgConnectionString("postgresql://ratio:ratio@postgres:5432/ratio");

    expect(config.ssl).toBeFalsy();
  });
});
