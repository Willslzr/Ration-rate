import { z } from "zod";
import { EnvValidationError } from "./EnvValidationError.js";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CRON_EXPRESSION: z.string().min(1, "CRON_EXPRESSION must not be empty").default("0 * * * *"),
  DISCORD_WEBHOOK_URL: z.string().min(1).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_CHAT_ID: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new EnvValidationError(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}
