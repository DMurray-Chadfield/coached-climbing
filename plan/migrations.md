# Migration Strategy and Tracking

## Goal
Track schema changes safely and make them reproducible across local, staging, and production.

## Tooling Choice
- Use SQL migrations committed to git.
- Keep each migration as an immutable file in a versioned migrations directory.
- Maintain a migration history table in Postgres (for example: `schema_migrations`).

## Migration Workflow
1. Create migration for schema change.
2. Review migration SQL in PR.
3. Apply migration locally.
4. Run tests and verify app behavior.
5. Apply migration in staging.
6. Apply migration in production during deployment window.

## Naming Convention
- `YYYYMMDDHHMM__short_description.sql`
- Example: `202602151230__create_training_plan_tables.sql`

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
- Validate migration on staging dataset size when possible.

## Rollback Policy
- Default policy: forward-fix migration.
- Hard rollback only if required and backup restore is available.
- Document any manual remediation steps in release notes.

## Auditing and Visibility
- Keep a migration changelog in PR/release notes.
- Track which app version introduced each migration.
- Periodically verify production schema matches expected migration state.
