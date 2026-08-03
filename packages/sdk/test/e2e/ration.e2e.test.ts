import {
  buildServer,
  createPrismaClient,
  PrismaExchangeRateRepository,
  type ServerInstance,
} from "@ratio/api";
import { CurrencyCode, ExchangeRate, GetLatestRate, GetRateByDate, RateValue } from "@ratio/core";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ration } from "../../src/ration.js";

const apiRoot = path.resolve(import.meta.dirname, "../../../api");
const NOW = new Date("2026-08-02T12:00:00.000Z");
const API_KEY = "sdk-e2e-test-key";

let tempDir: string;
let prisma: Awaited<ReturnType<typeof createPrismaClient>>;
let app: ServerInstance;
let baseUrl: string;

beforeAll(async () => {
  tempDir = mkdtempSync(path.join(tmpdir(), "ratio-sdk-e2e-"));
  const databaseUrl = `file:${path.join(tempDir, `${randomUUID()}.db`)}`;

  execSync("pnpm exec prisma migrate deploy", {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });

  prisma = createPrismaClient(databaseUrl);
  const repository = new PrismaExchangeRateRepository(prisma);

  await repository.save(
    ExchangeRate.create(
      {
        currency: CurrencyCode.create("VES"),
        rate: RateValue.create("35"),
        source: "bcv_oficial",
        extractedAt: new Date("2026-04-14T10:00:00.000Z"),
      },
      NOW,
    ),
  );
  await repository.save(
    ExchangeRate.create(
      {
        currency: CurrencyCode.create("VES"),
        rate: RateValue.create("36.5842"),
        source: "bcv_oficial",
        extractedAt: new Date("2026-04-20T10:00:00.000Z"),
      },
      NOW,
    ),
  );

  app = buildServer({
    getLatestRate: new GetLatestRate(repository),
    getRateByDate: new GetRateByDate(repository),
    scrapeAllTargets: { execute: () => Promise.resolve({ succeeded: [], failed: [] }) },
    targets: [],
    checkDatabaseHealth: () => Promise.resolve(true),
    apiKeys: [API_KEY],
    nodeEnv: "test",
  });

  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  baseUrl = address;
}, 30_000);

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  rmSync(tempDir, { recursive: true, force: true });
});

describe("ration() end-to-end against a real server", () => {
  it("fetches the latest seeded rate, no apiKey needed (GET /v1/rates/* is public)", async () => {
    const result = await ration("VES", undefined, { baseUrl });

    expect(result).toEqual({
      isoCode: "VES",
      rate: "36.5842",
      source: "bcv_oficial",
      extractedAt: new Date("2026-04-20T10:00:00.000Z"),
    });
  });

  it("fetches the seeded rate for a specific date, given in DD/MM/YYYY", async () => {
    const result = await ration("VES", "14/04/2026", { baseUrl });

    expect(result).toEqual({
      isoCode: "VES",
      rate: "35",
      source: "bcv_oficial",
      extractedAt: new Date("2026-04-14T10:00:00.000Z"),
    });
  });
});
