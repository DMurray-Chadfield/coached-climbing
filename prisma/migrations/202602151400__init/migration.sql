-- Author: Team
-- Date: 2026-02-15
-- Purpose: Initialize auth, questionnaire, plan, and plan version tables for MVP slice 1
-- Backward compatibility note: Additive first migration; no backward-compat concern yet
-- Rollback note: Forward-fix preferred. Hard rollback requires dropping created tables.

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT
);

CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

CREATE TABLE IF NOT EXISTS "QuestionnaireResponse" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionnaireResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "QuestionnaireResponse_userId_createdAt_idx" ON "QuestionnaireResponse"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "TrainingPlan" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "goal" TEXT,
  "currentPlanVersionId" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TrainingPlan_userId_updatedAt_idx" ON "TrainingPlan"("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "TrainingPlanVersion" (
  "id" TEXT PRIMARY KEY,
  "trainingPlanId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "planJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingPlanVersion_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingPlanVersion_trainingPlanId_versionNumber_key" ON "TrainingPlanVersion"("trainingPlanId", "versionNumber");
CREATE INDEX IF NOT EXISTS "TrainingPlanVersion_trainingPlanId_createdAt_idx" ON "TrainingPlanVersion"("trainingPlanId", "createdAt");

ALTER TABLE "TrainingPlan"
ADD CONSTRAINT "TrainingPlan_currentPlanVersionId_fkey"
FOREIGN KEY ("currentPlanVersionId") REFERENCES "TrainingPlanVersion"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
