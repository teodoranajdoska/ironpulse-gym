CREATE TABLE "NutritionGenerationQuota" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "generationDay" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionGenerationQuota_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "NutritionGenerationQuota_memberId_generationDay_key"
ON "NutritionGenerationQuota"("memberId", "generationDay");

CREATE INDEX "NutritionGenerationQuota_memberId_createdAt_idx"
ON "NutritionGenerationQuota"("memberId", "createdAt");
