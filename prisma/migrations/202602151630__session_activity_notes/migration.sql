-- Author: Team
-- Date: 2026-02-15
-- Purpose: Add per-session and per-activity notes tied to user + plan version
-- Backward compatibility note: Additive migration; no changes to existing immutable plan JSON
-- Rollback note: Forward-fix preferred. Hard rollback requires dropping added tables/indexes.

CREATE TABLE IF NOT EXISTS "SessionNote" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "trainingPlanId" TEXT NOT NULL,
  "planVersionId" TEXT NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "sessionNumber" INTEGER NOT NULL,
  "noteText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionNote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SessionNote_trainingPlanId_fkey"
    FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SessionNote_planVersionId_fkey"
    FOREIGN KEY ("planVersionId") REFERENCES "TrainingPlanVersion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SessionNote_userId_planVersionId_weekNumber_sessionNumber_key"
ON "SessionNote"("userId", "planVersionId", "weekNumber", "sessionNumber");

CREATE INDEX IF NOT EXISTS "SessionNote_trainingPlanId_planVersionId_idx"
ON "SessionNote"("trainingPlanId", "planVersionId");

CREATE TABLE IF NOT EXISTS "ActivityNote" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "trainingPlanId" TEXT NOT NULL,
  "planVersionId" TEXT NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "sessionNumber" INTEGER NOT NULL,
  "activityId" TEXT NOT NULL,
  "noteText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityNote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ActivityNote_trainingPlanId_fkey"
    FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ActivityNote_planVersionId_fkey"
    FOREIGN KEY ("planVersionId") REFERENCES "TrainingPlanVersion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ActivityNote_userId_planVersionId_weekNumber_sessionNumber_activityId_key"
ON "ActivityNote"("userId", "planVersionId", "weekNumber", "sessionNumber", "activityId");

CREATE INDEX IF NOT EXISTS "ActivityNote_trainingPlanId_planVersionId_idx"
ON "ActivityNote"("trainingPlanId", "planVersionId");
