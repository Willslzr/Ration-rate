-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "iso_code" TEXT NOT NULL,
    "rate" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "extracted_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "exchange_rates_iso_code_source_extracted_at_idx" ON "exchange_rates"("iso_code", "source", "extracted_at");
