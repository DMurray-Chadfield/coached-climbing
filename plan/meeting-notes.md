# Meeting Notes

## 2026-02-15 - Vertical Slice 1 Implementation Update

### Agenda
- Stand up MVP slice foundation and first end-to-end flow

### Notes
- Implemented full app scaffold with Next.js + TypeScript.
- Added Prisma schema and initial SQL migration for auth, questionnaires, plans, and plan versions.
- Added NextAuth credentials flow with signup API and protected app routes.
- Added questionnaire UI/API with server-side schema validation.
- Added plan generation API using OpenAI structured output (`json_schema`, `strict`) with validation + single retry.
- Added immutable plan version persistence and authenticated dashboard/list/detail pages.
- Added unit + integration test suites and CI workflow with required unit gate and non-blocking integration lane.

### Decisions
- Keep integration tests non-blocking for this slice while unit/typecheck/lint remain merge-required.
- Keep model selection environment-driven via `OPENAI_MODEL_PRIMARY`.

### Action Items
| Action | Owner | Due |
|---|---|---|
| Install Node.js + pnpm locally and run lint/typecheck/tests | Team | 2026-02-16 |
| Run manual desktop/mobile smoke checklist for implemented flows | Team | 2026-02-16 |
| Start next slice (completion tracking + tweak/chat flows) | Team | 2026-02-17 |

## 2026-02-15 - Slice 2/3 Follow-up (Completion, Notes, Context-Rich Chat)

### Agenda
- Complete completion + notes UX and ship plan-page context-aware chat

### Notes
- Implemented activity/session completion persistence and progress UI.
- Added session/activity notes persistence and plan UI note editors.
- Added context-rich chat prompts that include latest onboarding, plan, completion, and notes.
- Implemented default-thread-per-plan-version behavior and manual chat reset endpoint.
- Added plan-page chat panel with optimistic sends and `Enter` submit (`Shift+Enter` newline).
- Updated training context terminology from `Peak phase` to `Specialization phase`.
- Added explicit instruction to include rest timing whenever sets/reps are prescribed.

### Decisions
- Keep chat thread UX simple for now: one default thread per current plan version + manual reset.
- Keep chat in plan page (rendered above plan content) instead of separate standalone screen in this slice.

### Action Items
| Action | Owner | Due |
|---|---|---|
| Add optional "Apply as tweak" action from chat messages | Team | 2026-02-18 |
| Run full manual smoke pass for chat + notes + completion on mobile/desktop | Team | 2026-02-16 |

## 2026-02-15 - Slice 3 Chat Apply + Rollover Hardening

### Agenda
- Ship apply-from-chat flow and tighten version rollover + chat reliability UX

### Notes
- Added `Apply as tweak` action on assistant chat messages using the existing tweak endpoint.
- Chat panel now auto-refreshes plan detail after successful apply to pick up the new `currentPlanVersion`.
- Thread bootstrap now resets transient local chat state when `planVersionId` changes, preserving single-thread-per-version UX.
- Added auto-scroll, assistant typing indicator, and retry action for failed sends.
- Added compact chat-context builders for onboarding/completion/notes to reduce payload size before LLM chat calls.
- Expanded integration/unit tests for apply-flow coverage, per-version thread rollover behavior, and deterministic context compaction.

### Decisions
- Keep apply scope default as `whole_plan`.
- Keep no-thread-picker UX; continue using one default chat thread per plan version.

### Action Items
| Action | Owner | Due |
|---|---|---|
| Run full release-ready manual smoke pass including chat apply + rollover flow | Team | 2026-02-16 |

## 2026-02-15 - Slice 4 Stabilization (Data Integrity + UX Polish)

### Agenda
- Tighten plan lifecycle behavior and align docs/UX with shipped flows

### Notes
- Added onboarding field for facilities/equipment availability and wired it through validation + tests.
- Updated dashboard UX: clearer Open Plan CTA and readable timestamps.
- Removed dashboard regenerate action for generated plans (regenerate remains on plan detail page).
- Added soft-delete flow for plans (`deletedAt`) with dashboard delete action and app-wide deleted-plan guards.
- Enforced tweak protection so completed sessions are preserved from source plans.
- Added chat history carry-forward when a tweak creates a new plan version.
- Updated training context guidance to default to indoor climbing unless user explicitly requests outdoor-specific planning.

### Decisions
- Keep deleted plans hidden from normal app flows instead of exposing a recycle bin in MVP.
- Keep tweak scope default as whole-plan for apply-from-chat flow.

### Action Items
| Action | Owner | Due |
|---|---|---|
| Run full manual smoke pass including delete-plan and chat-history carry-forward flows | Team | 2026-02-16 |
