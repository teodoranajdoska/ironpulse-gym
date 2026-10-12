-- CreateTable
CREATE TABLE "TrainerAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainerId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startsAt" INTEGER NOT NULL,
    "endsAt" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainerAvailability_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "planId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Membership" ("createdAt", "endsAt", "id", "planId", "startsAt", "status", "updatedAt", "userId") SELECT "createdAt", "endsAt", "id", "planId", "startsAt", "status", "updatedAt", "userId" FROM "Membership";
DROP TABLE "Membership";
ALTER TABLE "new_Membership" RENAME TO "Membership";
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE INDEX "Membership_status_endsAt_idx" ON "Membership"("status", "endsAt");
CREATE INDEX "Membership_userId_status_endsAt_idx" ON "Membership"("userId", "status", "endsAt");
CREATE TABLE "new_Sponsor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "companyName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sponsor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sponsor" ("companyName", "createdAt", "id", "isActive", "logoUrl", "tier", "updatedAt", "userId", "websiteUrl") SELECT "companyName", "createdAt", "id", "isActive", "logoUrl", "tier", "updatedAt", "userId", "websiteUrl" FROM "Sponsor";
DROP TABLE "Sponsor";
ALTER TABLE "new_Sponsor" RENAME TO "Sponsor";
CREATE UNIQUE INDEX "Sponsor_userId_key" ON "Sponsor"("userId");
CREATE TABLE "new_TrainerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "specialties" JSONB NOT NULL,
    "photoUrl" TEXT,
    "bookingVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TrainerProfile" ("bio", "createdAt", "id", "photoUrl", "specialties", "updatedAt", "userId") SELECT "bio", "createdAt", "id", "photoUrl", "specialties", "updatedAt", "userId" FROM "TrainerProfile";
DROP TABLE "TrainerProfile";
ALTER TABLE "new_TrainerProfile" RENAME TO "TrainerProfile";
CREATE UNIQUE INDEX "TrainerProfile_userId_key" ON "TrainerProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TrainerAvailability_trainerId_weekday_idx" ON "TrainerAvailability"("trainerId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerAvailability_trainerId_weekday_startsAt_key" ON "TrainerAvailability"("trainerId", "weekday", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_trainerId_status_startsAt_endsAt_idx" ON "Appointment"("trainerId", "status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Appointment_memberId_startsAt_idx" ON "Appointment"("memberId", "startsAt");

-- CreateIndex
CREATE INDEX "NutritionPlan_memberId_createdAt_idx" ON "NutritionPlan"("memberId", "createdAt");
