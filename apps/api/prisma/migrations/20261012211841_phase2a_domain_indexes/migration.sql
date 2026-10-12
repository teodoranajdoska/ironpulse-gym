-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "Machine_isPublic_category_idx" ON "Machine"("isPublic", "category");

-- CreateIndex
CREATE INDEX "Membership_status_endsAt_idx" ON "Membership"("status", "endsAt");

-- CreateIndex
CREATE INDEX "Membership_userId_status_endsAt_idx" ON "Membership"("userId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "TrialRequest_status_createdAt_idx" ON "TrialRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkoutLog_memberId_performedAt_idx" ON "WorkoutLog"("memberId", "performedAt");

-- CreateIndex
CREATE INDEX "WorkoutLog_memberId_exerciseId_performedAt_idx" ON "WorkoutLog"("memberId", "exerciseId", "performedAt");

-- CreateIndex
CREATE INDEX "WorkoutSet_logId_idx" ON "WorkoutSet"("logId");
