import type { ExchangeRate, GetLatestRate, GetRateByDate } from "@ratio/core";
import type { ServerInstance } from "./buildServer.js";
import {
  IsoCodeParamsSchema,
  LatestRateQuerySchema,
  RateByDateQuerySchema,
  RateResponseSchema,
} from "./schemas.js";

export interface RatesRoutesDeps {
  readonly getLatestRate: Pick<GetLatestRate, "execute">;
  readonly getRateByDate: Pick<GetRateByDate, "execute">;
}

function toRateResponse(rate: ExchangeRate): {
  isoCode: string;
  rate: string;
  source: string;
  extractedAt: string;
} {
  return {
    isoCode: rate.currency.toString(),
    rate: rate.rate.toString(),
    source: rate.source,
    extractedAt: rate.extractedAt.toISOString(),
  };
}

export function registerRatesRoutes(app: ServerInstance, deps: RatesRoutesDeps): void {
  app.get(
    "/v1/rates/:isoCode/latest",
    {
      schema: {
        params: IsoCodeParamsSchema,
        querystring: LatestRateQuerySchema,
        response: { 200: RateResponseSchema },
      },
    },
    async (request, reply) => {
      const rate = await deps.getLatestRate.execute(request.params.isoCode, request.query.source);
      return reply.code(200).send(toRateResponse(rate));
    },
  );

  app.get(
    "/v1/rates/:isoCode",
    {
      schema: {
        params: IsoCodeParamsSchema,
        querystring: RateByDateQuerySchema,
        response: { 200: RateResponseSchema },
      },
    },
    async (request, reply) => {
      const { isoCode } = request.params;
      const { date, source } = request.query;
      const rate = await deps.getRateByDate.execute(isoCode, date, source);
      return reply.code(200).send(toRateResponse(rate));
    },
  );
}
