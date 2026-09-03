CREATE TABLE IF NOT EXISTS "CompanyDocument" (
  "id" TEXT NOT NULL,
  "registrationNumber" SERIAL NOT NULL,
  "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "direction" TEXT NOT NULL DEFAULT 'INCOMING',
  "documentType" TEXT NOT NULL,
  "documentNumber" TEXT,
  "documentDate" TIMESTAMP(3),
  "partnerName" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "notes" TEXT,
  "isCancelled" BOOLEAN NOT NULL DEFAULT false,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompanyDocument_registrationNumber_key"
  ON "CompanyDocument"("registrationNumber");
CREATE INDEX IF NOT EXISTS "CompanyDocument_registrationDate_idx"
  ON "CompanyDocument"("registrationDate");
CREATE INDEX IF NOT EXISTS "CompanyDocument_direction_idx"
  ON "CompanyDocument"("direction");
CREATE INDEX IF NOT EXISTS "CompanyDocument_partnerName_idx"
  ON "CompanyDocument"("partnerName");
