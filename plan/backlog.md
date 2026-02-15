# Backlog

## Priority Legend
- P0: Critical
- P1: High
- P2: Medium
- P3: Low

## Tasks
| ID | Priority | Task | Owner | Status | Notes |
|---|---|---|---|---|---|
| T-001 | P0 | Set up app scaffold, DB, and environment config | Team | Done | Next.js app, Prisma schema/migration, env schema, and base configs added |
| T-002 | P0 | Implement auth (signup/login/logout) | Team | Done | Signup API + NextAuth credentials login + logout button |
| T-003 | P0 | Design questionnaire schema and UI form | Team | Done | Simplified questionnaire shipped (merged target+goals, combined current-level field, removed sex/past exercises/load tolerance) |
| T-004 | P0 | Define JSON plan schema (`week/session/activities`) | Team | Done | JSON schema added and validated server-side before persistence |
| T-005 | P0 | Build LLM generation endpoint with schema validation + retry | Team | Done | Generate API uses structured output with one retry on validation failure |
| T-006 | P0 | Save versioned plans per user | Team | Done | Immutable `TrainingPlanVersion` records with current pointer set on create |
| T-007 | P0 | Build authenticated homepage listing user plans + "Create Plan" CTA | Team | Done | Dashboard is start point with Create Plan, per-plan onboarding link, and Open Plan primary CTA |
| T-015 | P0 | Implement activity + session completion models and toggle APIs | Team | Done | Added `ActivityCompletion`/`SessionCompletion` models + idempotent toggle APIs with ownership checks |
| T-016 | P1 | Add session/activity completion checkboxes in plan UI and progress indicators | Team | Done | `/plans/[planId]` now renders completion checkboxes and plan/session progress percentages backed by API state |
| T-031 | P1 | Add activity logging UI for stats + feelings and persist activity log entries | Team | Todo | Enables richer AI plan discussions |
| T-032 | P0 | Implement completion/log carry-forward mapping between plan versions | Team | Done | Deterministic carry-forward copies matching completion + session-note state into new tweak-created versions |
| T-014 | P1 | Build weekly/session plan viewer UI | Team | Done | Plan detail page renders stored current version JSON |
| T-017 | P0 | Build plan tweak API (week or whole plan) with LLM + schema validation | Team | Done | Added tweak API with strict structured output, validation, retry, and versioned persistence |
| T-033 | P0 | Enforce OpenAI structured output (`response_format: json_schema`, `strict: true`) for generation/tweak endpoints | Team | Done | Generation and tweak endpoints now both enforce `json_schema` + `strict: true` |
| T-018 | P1 | Add tweak UI in plan view (request box + scope selector + summary display) | Team | Todo | User-facing tweak flow |
| T-019 | P1 | Persist tweak request history and resulting plan versions | Team | Done | Tweak request records + result version linkage persisted and listable via tweak history endpoint |
| T-020 | P0 | Enforce LLM base context loading from discipline-specific context files for all LLM endpoints | Team | Done | Generation, tweak, and chat now load `training-ideas-bouldering.md` or `training-ideas-sport-trad.md` based on plan discipline |
| T-021 | P1 | Build plan chat API + thread/message persistence | Team | Done | Added owned thread/message APIs with assistant reply persistence and no plan mutation |
| T-022 | P1 | Add separate plan chat UI with "Apply as tweak" action | Team | Done | Plan-page chat supports apply-from-chat, auto-rollover to new version thread, retry/typing/autoscroll UX |
| T-023 | P0 | Implement and QA responsive UI for mobile + desktop across all core flows | Team | Done | Added mobile-first layout and overflow fixes for plan detail, progress, chat, and JSON display |
| T-024 | P0 | Set up local Postgres Docker workflow and `.env` bootstrap docs | Team | Done | Docker Compose + `.env.example` added |
| T-030 | P0 | Define and implement Docker Compose stack (`web`,`db`,`proxy`) for local/staging/prod | Team | Done | `docker-compose.yml` includes `web`,`db`,`proxy` |
| T-025 | P0 | Implement unit/integration test suites and CI test gate | Team | Done | Added required/release gate scripts and aligned CI + smoke checklist with non-blocking integration policy |
| T-029 | P1 | Create manual smoke test checklist for desktop + mobile core flows | Team | Done | Checklist now includes completion, notes, tweak, and chat/reset coverage |
| T-034 | P1 | Soft-delete plans from dashboard and hide deleted plans from app flows | Team | Done | Added `deletedAt` soft delete + delete API/UI + deleted-plan guards on plan APIs/pages |
| T-026 | P1 | Implement staging -> production deployment pipeline and smoke tests | Team | Todo | Safer releases |
| T-027 | P0 | Implement migration tooling/workflow with migration state tracking table | Team | Done | Migration workflow now uses `_prisma_migrations` source-of-truth with explicit verification script and runbook steps |
| T-028 | P1 | Add pre-release backup + rollback checklist to release workflow | Team | Todo | Production safety |
| T-008 | P1 | Add rate limits and usage caps for free MVP access | Team | Todo | Cost control |
| T-009 | P1 | Instrument analytics for activation and retention | Team | Todo | Measure product fit |
| T-010 | P1 | Add guardrails for unsafe or impossible training loads | Team | Todo | Safety |
| T-011 | P2 | Integrate Stripe checkout and subscription state (post-MVP) | Team | Todo | Monetization |
| T-012 | P2 | Add plan regeneration controls and limits | Team | Todo | Post-MVP improvement |
| T-013 | P2 | Add Stripe webhooks and billing state sync (post-MVP) | Team | Todo | Billing reliability |

## Status Values
- Todo
- In Progress
- Blocked
- Done
