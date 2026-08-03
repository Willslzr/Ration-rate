import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const IsoCodeParamsSchema = Type.Object({
  isoCode: Type.String({ minLength: 3, maxLength: 3, pattern: "^[A-Za-z]{3}$" }),
});
export type IsoCodeParams = Static<typeof IsoCodeParamsSchema>;

export const LatestRateQuerySchema = Type.Object({
  source: Type.Optional(Type.String({ minLength: 1 })),
});
export type LatestRateQuery = Static<typeof LatestRateQuerySchema>;

export const RateByDateQuerySchema = Type.Object({
  date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  source: Type.Optional(Type.String({ minLength: 1 })),
});
export type RateByDateQuery = Static<typeof RateByDateQuerySchema>;

export const RateResponseSchema = Type.Object({
  isoCode: Type.String(),
  rate: Type.String(),
  source: Type.String(),
  extractedAt: Type.String(),
});
export type RateResponse = Static<typeof RateResponseSchema>;
