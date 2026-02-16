# Migration Strategy and Tracking

## Goal
Track schema changes safely and make them reproducible across local, staging, and production.

## Tooling Choice
- Use Prisma migrations (SQL) committed to git.
- Keep each migration as an immutable directory under `prisma/migrations/` containing `migration.sql`.
- Use Prisma migration state table `_prisma_migrations` in Postgres as source of truth.

## Migration Workflow
1. Create migration for schema change.
2. Review migration SQL in PR.
3. Apply migration locally.
4. Run tests and verify app behavior.
5. For manual prod deploy, verify migration state before and after release.
6. Apply migration in production during deployment window.

## Verification Commands
- Local/app-level status:
  - `pnpm prisma:migrate:status`
- Compose DB table verification (manual deploy):
  - `pnpm release:verify:migrations`
- Direct SQL fallback:
  - `SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY finished_at DESC;`

## Naming Convention
- `YYYYMMDDHHMM__short_description`
- Example: `202602151230__create_training_plan_tables`

## Rules
- Never edit an already-applied migration.
- New change => new migration file.
- Keep migrations small and focused.
- Include indexes and constraints in same migration when possible.

## Required Migration Metadata
- Author
- Date
- Purpose
- Backward compatibility note
- Rollback note (forward-fix preferred)

## Production Safety Checklist
- Confirm full DB backup completed.
- Estimate lock impact for each migration.
- Avoid long blocking operations in peak traffic windows.
- Run `pnpm prisma:migrate:status` before and after `pnpm prisma:migrate:deploy`.
- Record migration verification output in release notes.

## Rollback Policy
- Default policy: forward-fix migration.
- Hard rollback only if required and backup restore is available.
- Document any manual remediation steps in release notes.

## Auditing and Visibility
- Keep a migration changelog in PR/release notes.
- Track which app version introduced each migration.
- Periodically verify production schema matches expected `_prisma_migrations` state.

## Current Migration Sequence
- `202602151400__init`
- `202602151430__questionnaire_per_plan`
- `202602151600__completion_tweak_chat_foundations`
- `202602151630__session_activity_notes`
- `202602151700__soft_delete_training_plan`
- `202602151958__drop_activity_note` (removes deprecated `ActivityNote` table)
- `202602161200__plan_generation_jobs`
