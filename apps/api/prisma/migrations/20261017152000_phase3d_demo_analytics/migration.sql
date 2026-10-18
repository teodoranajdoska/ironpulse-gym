ALTER TABLE "TrialRequest" RENAME TO "TrialRequest_old";

CREATE TABLE "TrialRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "preferredDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "TrialRequest" ("id", "name", "email", "phone", "preferredDate", "status", "createdAt")
SELECT "id", "name", "email", "phone", "preferredDate",
       CASE "status"
         WHEN 'OPEN' THEN 'NEW'
         WHEN 'REVIEW' THEN 'CONTACTED'
         WHEN 'CLOSED' THEN 'CONVERTED'
         ELSE 'NEW'
       END,
       "createdAt"
FROM "TrialRequest_old";

DROP TABLE "TrialRequest_old";

CREATE INDEX "TrialRequest_status_createdAt_idx" ON "TrialRequest"("status", "createdAt");

CREATE TABLE "SponsorStatDaily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sponsorId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SponsorStatDaily_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SponsorStatDaily_sponsorId_day_key" ON "SponsorStatDaily"("sponsorId", "day");
CREATE INDEX "SponsorStatDaily_sponsorId_day_idx" ON "SponsorStatDaily"("sponsorId", "day");
