-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" SERIAL NOT NULL,
    "iso_code" TEXT NOT NULL,
    "rate" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "extracted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_rates_iso_code_source_extracted_at_idx" ON "exchange_rates"("iso_code", "source", "extracted_at");
