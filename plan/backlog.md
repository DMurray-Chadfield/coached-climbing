# Backlog

## Priority Legend
- P0: Critical
- P1: High
- P2: Medium
- P3: Low

## Tasks
| ID | Priority | Task | Owner | Status | Notes |
|---|---|---|---|---|---|
| T-001 | P0 | Set up app scaffold, DB, and environment config | Team | Todo | Foundation |
| T-002 | P0 | Implement auth (signup/login/logout) | Team | Todo | Required for user data |
| T-003 | P0 | Design questionnaire schema and UI form | Team | Todo | Inputs for AI plan |
| T-004 | P0 | Define JSON plan schema (`week/session/activities`) | Team | Todo | Strict validation target |
| T-005 | P0 | Build LLM generation endpoint with schema validation + retry | Team | Todo | Core intelligence |
| T-006 | P0 | Save versioned plans per user | Team | Todo | Enables plan history |
| T-007 | P0 | Build authenticated homepage listing user plans + "Create Plan" CTA | Team | Todo | Core navigation |
| T-015 | P0 | Implement activity + session completion models and toggle APIs | Team | Todo | Track checked sessions and activities |
| T-016 | P1 | Add session/activity completion checkboxes in plan UI and progress indicators | Team | Todo | Improve adherence tracking |
| T-031 | P1 | Add activity logging UI for stats + feelings and persist activity log entries | Team | Todo | Enables richer AI plan discussions |
| T-032 | P0 | Implement completion/log carry-forward mapping between plan versions with `review_needed` flags | Team | Todo | Prevents incorrect completion state after tweaks |
| T-014 | P1 | Build weekly/session plan viewer UI | Team | Todo | Display selected plan |
| T-017 | P0 | Build plan tweak API (week or whole plan) with LLM + schema validation | Team | Todo | Return updated/unchanged plan + summary |
| T-033 | P0 | Enforce OpenAI structured output (`response_format: json_schema`, `strict: true`) for generation/tweak endpoints | Team | Todo | Reduce malformed outputs |
| T-018 | P1 | Add tweak UI in plan view (request box + scope selector + summary display) | Team | Todo | User-facing tweak flow |
| T-019 | P1 | Persist tweak request history and resulting plan versions | Team | Todo | Auditability + rollback confidence |
| T-020 | P0 | Enforce LLM base context loading from `training info/training-ideas.md` for all LLM endpoints | Team | Todo | Generation, tweak, and chat consistency |
| T-021 | P1 | Build plan chat API + thread/message persistence | Team | Todo | Plan discussion without auto-edit |
| T-022 | P1 | Add separate plan chat UI with "Apply as tweak" action | Team | Todo | Convert chat suggestions into tweak flow |
| T-023 | P0 | Implement and QA responsive UI for mobile + desktop across all core flows | Team | Todo | Includes onboarding, plans, completion, tweaks, and chat |
| T-024 | P0 | Set up local Postgres Docker workflow and `.env` bootstrap docs | Team | Todo | Standardize local setup |
| T-030 | P0 | Define and implement Docker Compose stack (`web`,`db`,`proxy`) for local/staging/prod | Team | Todo | Single deployment model |
| T-025 | P0 | Implement unit/integration test suites and CI test gate | Team | Todo | Block broken releases |
| T-029 | P1 | Create manual smoke test checklist for desktop + mobile core flows | Team | Todo | Replace E2E requirement for MVP |
| T-026 | P1 | Implement staging -> production deployment pipeline and smoke tests | Team | Todo | Safer releases |
| T-027 | P0 | Implement migration tooling/workflow with migration state tracking table | Team | Todo | Reproducible schema changes |
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
