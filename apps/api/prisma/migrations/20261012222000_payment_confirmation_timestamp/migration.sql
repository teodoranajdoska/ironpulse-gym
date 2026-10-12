ALTER TABLE "PaymentRecord" ADD COLUMN "confirmedAt" DATETIME;

UPDATE "PaymentRecord"
SET "confirmedAt" = "createdAt"
WHERE "status" = 'CONFIRMED';

CREATE INDEX "PaymentRecord_status_confirmedAt_idx"
ON "PaymentRecord"("status", "confirmedAt");
