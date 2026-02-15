-- Author: Team
-- Date: 2026-02-15
-- Purpose: Add completion tracking plus tweak/chat foundation tables
-- Backward compatibility note: Additive migration only; existing auth/onboarding/generation tables unchanged
-- Rollback note: Forward-fix preferred. Hard rollback requires dropping added tables/types/indexes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SessionCompletionSource') THEN
    CREATE TYPE "SessionCompletionSource" AS ENUM ('manual', 'derived_all_activities');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanTweakScope') THEN
    CREATE TYPE "PlanTweakScope" AS ENUM ('week', 'whole_plan');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanTweakStatus') THEN
    CREATE TYPE "PlanTweakStatus" AS ENUM ('pending', 'accepted', 'rejected', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanChatRole') THEN
    CREATE TYPE "PlanChatRole" AS ENUM ('user', 'assistant');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ActivityCompletion" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "trainingPlanId" TEXT NOT NULL,
  "planVersionId" TEXT NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "sessionNumber" INTEGER NOT NULL,
  "activityId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityCompletion_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ActivityCompletion_trainingPlanId_fkey"
    FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ActivityCompletion_planVersionId_fkey"
    FOREIGN KEY ("planVersionId") REFERENCES "TrainingPlanVersion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ActivityCompletion_userId_planVersionId_weekNumber_sessionNumber_activityId_key"
ON "ActivityCompletion"("userId", "planVersionId", "weekNumber", "sessionNumber", "activityId");

CREATE INDEX IF NOT EXISTS "ActivityCompletion_trainingPlanId_planVersionId_idx"
ON "ActivityCompletion"("trainingPlanId", "planVersionId");

CREATE TABLE IF NOT EXISTS "SessionCompletion" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "trainingPlanId" TEXT NOT NULL,
  "planVersionId" TEXT NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "sessionNumber" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3),
  "completionSource" "SessionCompletionSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionCompletion_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SessionCompletion_trainingPlanId_fkey"
    FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SessionCompletion_planVersionId_fkey"
    FOREIGN KEY ("planVersionId") REFERENCES "TrainingPlanVersion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SessionCompletion_userId_planVersionId_weekNumber_sessionNumber_key"
ON "SessionCompletion"("userId", "planVersionId", "weekNumber", "sessionNumber");

CREATE INDEX IF NOT EXISTS "SessionCompletion_trainingPlanId_planVersionId_idx"
ON "SessionCompletion"("trainingPlanId", "planVersionId");

CREATE TABLE IF NOT EXISTS "PlanTweakRequest" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "trainingPlanId" TEXT NOT NULL,
  "sourcePlanVersionId" TEXT NOT NULL,
  "resultPlanVersionId" TEXT,
  "scope" "PlanTweakScope" NOT NULL,
  "targetWeekNumber" INTEGER,
  "requestText" TEXT NOT NULL,
  "llmSummaryText" TEXT,
  "status" "PlanTweakStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanTweakRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanTweakRequest_trainingPlanId_fkey"
    FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanTweakRequest_sourcePlanVersionId_fkey"
    FOREIGN KEY ("sourcePlanVersionId") REFERENCES "TrainingPlanVersion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanTweakRequest_resultPlanVersionId_fkey"
    FOREIGN KEY ("resultPlanVersionId") REFERENCES "TrainingPlanVersion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlanTweakRequest_trainingPlanId_createdAt_idx"
ON "PlanTweakRequest"("trainingPlanId", "createdAt");

CREATE INDEX IF NOT EXISTS "PlanTweakRequest_trainingPlanId_status_createdAt_idx"
ON "PlanTweakRequest"("trainingPlanId", "status", "createdAt");

CREATE TABLE IF NOT EXISTS "PlanChatThread" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "trainingPlanId" TEXT NOT NULL,
  "planVersionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanChatThread_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanChatThread_trainingPlanId_fkey"
    FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanChatThread_planVersionId_fkey"
    FOREIGN KEY ("planVersionId") REFERENCES "TrainingPlanVersion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlanChatThread_trainingPlanId_updatedAt_idx"
ON "PlanChatThread"("trainingPlanId", "updatedAt");

CREATE TABLE IF NOT EXISTS "PlanChatMessage" (
  "id" TEXT PRIMARY KEY,
  "threadId" TEXT NOT NULL,
  "role" "PlanChatRole" NOT NULL,
  "content" TEXT NOT NULL,
  "sourceTweakRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanChatMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "PlanChatThread"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlanChatMessage_sourceTweakRequestId_fkey"
    FOREIGN KEY ("sourceTweakRequestId") REFERENCES "PlanTweakRequest"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlanChatMessage_threadId_createdAt_idx"
ON "PlanChatMessage"("threadId", "createdAt");
