-- Author: Team
-- Date: 2026-02-15
-- Purpose: Associate questionnaire responses with a plan to support per-plan onboarding
-- Backward compatibility note: trainingPlanId is nullable to preserve existing rows
-- Rollback note: Forward-fix preferred; rollback would remove column/index/fk

ALTER TABLE "QuestionnaireResponse"
ADD COLUMN IF NOT EXISTS "trainingPlanId" TEXT;

CREATE INDEX IF NOT EXISTS "QuestionnaireResponse_userId_trainingPlanId_createdAt_idx"
ON "QuestionnaireResponse"("userId", "trainingPlanId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'QuestionnaireResponse_trainingPlanId_fkey'
  ) THEN
    ALTER TABLE "QuestionnaireResponse"
    ADD CONSTRAINT "QuestionnaireResponse_trainingPlanId_fkey"
    FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
