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
