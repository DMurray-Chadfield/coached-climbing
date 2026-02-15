-- Purpose: Soft delete training plans while retaining historical data

ALTER TABLE "TrainingPlan"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "TrainingPlan_userId_deletedAt_updatedAt_idx"
  ON "TrainingPlan"("userId", "deletedAt", "updatedAt");
