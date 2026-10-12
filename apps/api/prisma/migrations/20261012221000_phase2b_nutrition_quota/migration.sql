ALTER TABLE "NutritionPlan" ADD COLUMN "generationDay" TEXT;

CREATE UNIQUE INDEX "NutritionPlan_memberId_generationDay_key"
ON "NutritionPlan"("memberId", "generationDay");
