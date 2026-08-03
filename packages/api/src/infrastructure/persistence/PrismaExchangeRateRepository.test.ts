import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CurrencyCode, ExchangeRate, RateDate, RateValue } from "@ratio/core";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaExchangeRateRepository } from "./PrismaExchangeRateRepository.js";
import { createPrismaClient } from "./prismaClient.js";

const apiRoot = path.resolve(import.meta.dirname, "../../../");
const NOW = new Date("2026-08-02T12:00:00.000Z");

let tempDir: string;
let prisma: PrismaClient;
let repository: PrismaExchangeRateRepository;

beforeAll(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), "ratio-api-test-"));
  const databaseUrl = `file:${path.join(tempDir, `${randomUUID()}.db`)}`;

  execSync("pnpm exec prisma migrate deploy", {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });

  prisma = createPrismaClient(databaseUrl);
  repository = new PrismaExchangeRateRepository(prisma);
}, 30_000);

afterEach(async () => {
  await prisma.exchangeRate.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(tempDir, { recursive: true, force: true });
});

function buildRate(options: {
  isoCode?: string;
  rate?: string;
  source?: string;
  extractedAt: string;
}): ExchangeRate {
  return ExchangeRate.create(
    {
      currency: CurrencyCode.create(options.isoCode ?? "VES"),
      rate: RateValue.create(options.rate ?? "36.5842"),
      source: options.source ?? "bcv_oficial",
      extractedAt: new Date(options.extractedAt),
    },
    NOW,
  );
}

describe("PrismaExchangeRateRepository", () => {
  describe("save", () => {
    it("persists a rate and returns it with an assigned id", async () => {
      const saved = await repository.save(buildRate({ extractedAt: "2026-04-14T10:00:00.000Z" }));

      expect(saved.id).toEqual(expect.any(Number));
      expect(saved.currency.toString()).toBe("VES");
      expect(saved.rate.toString()).toBe("36.5842");
      expect(saved.source).toBe("bcv_oficial");
      expect(saved.extractedAt.toISOString()).toBe("2026-04-14T10:00:00.000Z");
    });
  });

  describe("findLatest", () => {
    it("returns null when there is no data for that currency", async () => {
      const result = await repository.findLatest(CurrencyCode.create("VES"));

      expect(result).toBeNull();
    });

    it("returns the most recent row among several for the same currency", async () => {
      await repository.save(buildRate({ extractedAt: "2026-04-10T08:00:00.000Z", rate: "35" }));
      await repository.save(buildRate({ extractedAt: "2026-04-14T08:00:00.000Z", rate: "36.5" }));
      await repository.save(buildRate({ extractedAt: "2026-04-12T08:00:00.000Z", rate: "36" }));

      const result = await repository.findLatest(CurrencyCode.create("VES"));

      expect(result?.rate.toString()).toBe("36.5");
      expect(result?.extractedAt.toISOString()).toBe("2026-04-14T08:00:00.000Z");
    });

    it("filters by source when provided", async () => {
      await repository.save(
        buildRate({ extractedAt: "2026-04-14T09:00:00.000Z", source: "bcv_oficial", rate: "36" }),
      );
      await repository.save(
        buildRate({ extractedAt: "2026-04-14T10:00:00.000Z", source: "paralelo", rate: "90" }),
      );

      const result = await repository.findLatest(CurrencyCode.create("VES"), "bcv_oficial");

      expect(result?.source).toBe("bcv_oficial");
      expect(result?.rate.toString()).toBe("36");
    });
  });

  describe("findByDate", () => {
    it("returns null when there is no data for that date", async () => {
      const result = await repository.findByDate(
        CurrencyCode.create("VES"),
        RateDate.fromIsoString("2026-04-14", NOW),
      );

      expect(result).toBeNull();
    });

    it("returns the most recent row within the UTC day, ignoring rows outside it", async () => {
      await repository.save(
        buildRate({ extractedAt: "2026-04-13T23:59:59.999Z", rate: "34" }), // just before the day
      );
      await repository.save(buildRate({ extractedAt: "2026-04-14T00:00:00.000Z", rate: "35" })); // day start
      await repository.save(buildRate({ extractedAt: "2026-04-14T12:00:00.000Z", rate: "36" })); // mid-day
      await repository.save(
        buildRate({ extractedAt: "2026-04-14T23:59:59.999Z", rate: "37" }), // day end
      );
      await repository.save(
        buildRate({ extractedAt: "2026-04-15T00:00:00.000Z", rate: "38" }), // just after the day
      );

      const result = await repository.findByDate(
        CurrencyCode.create("VES"),
        RateDate.fromIsoString("2026-04-14", NOW),
      );

      expect(result?.rate.toString()).toBe("37");
      expect(result?.extractedAt.toISOString()).toBe("2026-04-14T23:59:59.999Z");
    });

    it("filters by source when provided", async () => {
      await repository.save(
        buildRate({
          extractedAt: "2026-04-14T10:00:00.000Z",
          source: "bcv_oficial",
          rate: "36",
        }),
      );
      await repository.save(
        buildRate({ extractedAt: "2026-04-14T11:00:00.000Z", source: "paralelo", rate: "90" }),
      );

      const result = await repository.findByDate(
        CurrencyCode.create("VES"),
        RateDate.fromIsoString("2026-04-14", NOW),
        "paralelo",
      );

      expect(result?.source).toBe("paralelo");
      expect(result?.rate.toString()).toBe("90");
    });
  });
});
