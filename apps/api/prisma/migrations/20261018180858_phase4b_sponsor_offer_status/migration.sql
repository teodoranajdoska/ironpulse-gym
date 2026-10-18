-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SponsorOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sponsorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discountCode" TEXT,
    "validUntil" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SponsorOffer_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SponsorOffer" ("createdAt", "description", "discountCode", "id", "sponsorId", "title", "validUntil") SELECT "createdAt", "description", "discountCode", "id", "sponsorId", "title", "validUntil" FROM "SponsorOffer";
DROP TABLE "SponsorOffer";
ALTER TABLE "new_SponsorOffer" RENAME TO "SponsorOffer";
CREATE UNIQUE INDEX "SponsorOffer_discountCode_key" ON "SponsorOffer"("discountCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
