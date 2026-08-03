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
