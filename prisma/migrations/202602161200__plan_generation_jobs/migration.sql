-- Author: Team
-- Date: 2026-02-16
-- Purpose: Add PlanGenerationJob to support idempotent, resumable plan generation
-- Backward compatibility note: Additive migration only; existing plan/version tables unchanged
-- Rollback note: Forward-fix preferred. Hard rollback requires dropping added table/types/indexes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanGenerationJobStatus') THEN
    CREATE TYPE "PlanGenerationJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'canceled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PlanGenerationJob" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "trainingPlanId" TEXT NOT NULL,
  "questionnaireResponseId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "PlanGenerationJobStatus" NOT NULL,
  "retryCount" INTEGER,
  "resultPlanVersionId" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "errorDetails" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "PlanGenerationJob_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanGenerationJob_trainingPlanId_fkey"
    FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanGenerationJob_questionnaireResponseId_fkey"
    FOREIGN KEY ("questionnaireResponseId") REFERENCES "QuestionnaireResponse"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanGenerationJob_resultPlanVersionId_fkey"
    FOREIGN KEY ("resultPlanVersionId") REFERENCES "TrainingPlanVersion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlanGenerationJob_idempotencyKey_key"
ON "PlanGenerationJob"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "PlanGenerationJob_userId_trainingPlanId_createdAt_idx"
ON "PlanGenerationJob"("userId", "trainingPlanId", "createdAt");

CREATE INDEX IF NOT EXISTS "PlanGenerationJob_trainingPlanId_status_createdAt_idx"
ON "PlanGenerationJob"("trainingPlanId", "status", "createdAt");

-- Ensure at most one active (queued/running) job per user+plan.
CREATE UNIQUE INDEX IF NOT EXISTS "PlanGenerationJob_userId_trainingPlanId_active_key"
ON "PlanGenerationJob"("userId", "trainingPlanId")
WHERE "status" IN ('queued', 'running');

