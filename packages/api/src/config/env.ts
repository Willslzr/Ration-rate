import { z } from "zod";
import { EnvValidationError } from "./EnvValidationError.js";

// Container orchestrators (Docker Compose, Kubernetes, ...) often set an
// "unconfigured" variable to an empty string rather than omitting it
// entirely, so an empty string is treated the same as "not provided" here.
const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CRON_EXPRESSION: z.string().min(1, "CRON_EXPRESSION must not be empty").default("0 * * * *"),
  // No .default() here: the effective default depends on NODE_ENV, resolved
  // in loadEnv() below (zod can't reference another field's value from
  // within a single field's own schema).
  CRON_ENABLED: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["true", "false"], { message: 'CRON_ENABLED must be "true" or "false"' }).optional(),
  ),
  DISCORD_WEBHOOK_URL: optionalNonEmptyString,
  TELEGRAM_BOT_TOKEN: optionalNonEmptyString,
  TELEGRAM_CHAT_ID: optionalNonEmptyString,
  API_KEYS: z
    .string()
    .min(1, "API_KEYS is required")
    .transform((value) =>
      value
        .split(",")
        .map((key) => key.trim())
        .filter((key) => key.length > 0),
    )
    .refine((keys) => keys.length > 0, "API_KEYS must contain at least one non-empty key"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

type ParsedEnv = z.infer<typeof envSchema>;
export type Env = Omit<ParsedEnv, "CRON_ENABLED"> & { readonly CRON_ENABLED: boolean };

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new EnvValidationError(`Invalid environment configuration: ${details}`);
  }

  const data = result.data;
  return {
    ...data,
    // Render's free tier (and similar) sleeps the process after idle
    // periods, making the in-process node-cron scheduler unreliable in
    // production — there, scraping is expected to be triggered externally
    // (see .github/workflows/scrape.yml) instead. Development/test keep the
    // scheduler on by default so local runs behave as before.
    CRON_ENABLED:
      data.CRON_ENABLED === undefined
        ? data.NODE_ENV !== "production"
        : data.CRON_ENABLED === "true",
  };
}
