import "dotenv/config";
import { defineConfig } from "prisma/config";

// Separate config for the PostgreSQL schema variant (see
// prisma/postgresql/schema.prisma for why it's separate from prisma.config.ts):
// migrations.path is per-config, so this is the only way to point the CLI at
// prisma/postgresql/migrations instead of the SQLite migration history.
export default defineConfig({
  schema: "prisma/postgresql/schema.prisma",
  migrations: {
    path: "prisma/postgresql/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
