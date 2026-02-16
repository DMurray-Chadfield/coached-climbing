-- Author: Team
-- Date: 2026-02-16
-- Purpose: Add username-first auth identifier while preserving legacy email login.
-- Backward compatibility note: Existing users keep email/password auth and receive deterministic non-PII usernames.
-- Rollback note: Forward-fix preferred. Hard rollback requires removing username and restoring email NOT NULL.

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "username" TEXT;

UPDATE "User"
SET "username" = CONCAT('climber_', LOWER("id"))
WHERE "username" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key"
ON "User" ("username");

ALTER TABLE "User"
ALTER COLUMN "email" DROP NOT NULL;
