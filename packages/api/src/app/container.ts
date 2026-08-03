import { GetLatestRate, GetRateByDate, ScrapeAllTargets } from "@ratio/core";
import type { NotificationChannel, ScrapeTarget } from "@ratio/core";
import type { Env } from "../config/env.js";
import { loadEnv } from "../config/env.js";
import { SystemClock } from "../infrastructure/SystemClock.js";
import {
  CompositeNotifier,
  DiscordNotifier,
  NoopNotifier,
  TelegramNotifier,
} from "../infrastructure/notifications/index.js";
import {
  createPrismaClient,
  PrismaExchangeRateRepository,
} from "../infrastructure/persistence/index.js";
import { ExtractorFactory } from "../infrastructure/scraping/index.js";
import { targets } from "../targets.config.js";

export interface Container {
  readonly env: Env;
  readonly targets: readonly ScrapeTarget[];
  readonly useCases: {
    readonly getLatestRate: GetLatestRate;
    readonly getRateByDate: GetRateByDate;
    readonly scrapeAllTargets: ScrapeAllTargets;
  };
  checkDatabaseHealth(): Promise<boolean>;
  dispose(): Promise<void>;
}

export function buildNotifier(env: Env): NotificationChannel {
  const channels: NotificationChannel[] = [];

  if (env.DISCORD_WEBHOOK_URL) {
    channels.push(new DiscordNotifier(env.DISCORD_WEBHOOK_URL));
  }
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    channels.push(new TelegramNotifier(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID));
  }

  if (channels.length === 0) {
    return new NoopNotifier();
  }
  return channels.length === 1 ? channels[0]! : new CompositeNotifier(channels);
}

/**
 * The composition root: the only place in the app that instantiates concrete
 * adapters (Prisma, the extractor factory, webhook notifiers, the system
 * clock) and wires them into the core use cases.
 */
export function createContainer(env: Env = loadEnv()): Container {
  const prisma = createPrismaClient(env.DATABASE_URL);
  const repository = new PrismaExchangeRateRepository(prisma);
  const extractorFactory = new ExtractorFactory();
  const clock = new SystemClock();
  const notifier = buildNotifier(env);

  const useCases = {
    getLatestRate: new GetLatestRate(repository),
    getRateByDate: new GetRateByDate(repository),
    scrapeAllTargets: new ScrapeAllTargets({
      repository,
      extractor: extractorFactory,
      notifier,
      clock,
    }),
  };

  return {
    env,
    targets,
    useCases,
    async checkDatabaseHealth(): Promise<boolean> {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },
    async dispose(): Promise<void> {
      await extractorFactory.dispose();
      await prisma.$disconnect();
    },
  };
}
