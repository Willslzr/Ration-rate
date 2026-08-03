import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CurrencyCode, ExchangeRate, GetLatestRate, GetRateByDate, RateValue } from "@ratio/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { buildServer } from "../../src/infrastructure/http/buildServer.js";
import type { ServerInstance } from "../../src/infrastructure/http/buildServer.js";
import {
  createPrismaClient,
  PrismaExchangeRateRepository,
} from "../../src/infrastructure/persistence/index.js";

const apiRoot = path.resolve(import.meta.dirname, "../../");
const NOW = new Date("2026-08-02T12:00:00.000Z");
const API_KEY = "e2e-test-key";

let tempDir: string;
let prisma: PrismaClient;
let app: ServerInstance;

beforeAll(async () => {
  tempDir = mkdtempSync(path.join(tmpdir(), "ratio-api-e2e-"));
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
        extractedAt: new Date("2026-04-10T08:00:00.000Z"),
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
        extractedAt: new Date("2026-04-14T10:00:00.000Z"),
      },
      NOW,
    ),
  );

  app = buildServer({
    getLatestRate: new GetLatestRate(repository),
    getRateByDate: new GetRateByDate(repository),
    checkDatabaseHealth: () => Promise.resolve(true),
    apiKeys: [API_KEY],
    nodeEnv: "test",
  });
}, 30_000);

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  rmSync(tempDir, { recursive: true, force: true });
});

describe("API end-to-end", () => {
  it("seeds data and returns the latest rate for a currency", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/rates/VES/latest",
      headers: { "x-api-key": API_KEY },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      isoCode: "VES",
      rate: "36.5842",
      source: "bcv_oficial",
      extractedAt: "2026-04-14T10:00:00.000Z",
    });
  });

  it("returns the seeded rate for a specific date", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/rates/VES?date=2026-04-10",
      headers: { "x-api-key": API_KEY },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      isoCode: "VES",
      rate: "35",
      source: "bcv_oficial",
      extractedAt: "2026-04-10T08:00:00.000Z",
    });
  });

  it("returns 404 for a currency with no seeded data", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/rates/ARS/latest",
      headers: { "x-api-key": API_KEY },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: "RATE_NOT_FOUND" });
  });

  it("returns 401 when no api key is provided", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/rates/VES/latest" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
  });
});
