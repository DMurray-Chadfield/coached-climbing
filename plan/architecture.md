# Architecture

## Overview
Web application that collects climber profile data, sends structured inputs to an LLM with coaching context, validates returned JSON, stores plans, and renders them in a weekly training interface where users can mark sessions and session activities complete. A plan-chat panel lets users ask questions about their plan without necessarily modifying it.

## Components
- Frontend:
  - Next.js app (marketing + authenticated dashboard)
  - Authenticated homepage that starts with a primary "Create Plan" action and lists draft/generated plans with Open Plan CTA
  - Per-plan onboarding questionnaire (including facilities/equipment), plan viewer UI, and activity completion checkboxes
  - Responsive UI for mobile and desktop across dashboard, plan viewer, tweak flow, and plan chat
- Backend:
  - API routes/server actions for auth-protected operations
  - Plan generation service (prompt assembly, LLM call, schema validation, retry)
  - Activity/session completion endpoints (toggle complete/incomplete, list completion state)
  - Session/activity notes endpoints (persist note context for coaching and tweaks)
  - Plan tweak endpoints (week-specific or whole-plan tweak requests)
  - Plan chat endpoints (Q&A about a selected plan/version, optional "apply as tweak")
- Data:
  - PostgreSQL (users, plan-scoped questionnaires, plans, plan versions, activity completions, session completions, notes, chat/tweak metadata)
  - JSONB column for plan payload (`week -> session -> activities`)
- Runtime:
  - Docker Compose services for `web`, `db`, and `proxy` in local/staging/production
- Integrations:
  - LLM provider API (OpenAI) for plan generation
  - Future: Stripe for subscriptions and webhook events

## LLM Context Loading Rule
- Every LLM call should load base coaching context from a discipline-specific file:
  - `/Users/Student/src/tomteece.github.io/training info/training-ideas-bouldering.md`
  - `/Users/Student/src/tomteece.github.io/training info/training-ideas-sport-trad.md`
- Discipline source of truth:
  - generation: onboarding `plan_discipline`
  - tweak/chat: latest plan-scoped onboarding (fallback: infer from plan JSON)
- Every plan-generation/tweak call must request structured output from OpenAI API:
  - `response_format.type = json_schema`
  - `json_schema.strict = true`
- Prompt assembly order:
  1. System/base context from selected discipline file
  2. Safety and output constraints
  3. User/plan-specific payload (questionnaire, plan JSON, request/chat message)

## Data Flow
1. User signs up, logs in, and lands on dashboard.
2. User clicks "Create Plan" to create a draft plan.
3. User opens onboarding for that specific plan (`planId`).
4. Questionnaire responses are saved with plan linkage in the database.
5. User triggers "Generate" for that specific plan.
6. Backend assembles prompt using:
   - user questionnaire data
   - climbing-coaching rules/context you provide
   - weekly session count (Session 1..N) instead of fixed weekdays
   - requirement that each session includes a short `description` (reason, goals, target effort)
   - required JSON schema
7. LLM returns candidate JSON plan.
8. Backend validates plan against schema (server-side validation even when structured output is enabled).
9. If invalid, backend retries with correction prompt.
10. Valid plan is saved as a new version on the selected plan, and current pointer is updated.
11. Homepage refresh shows all user plans, newest first, with onboarding/generate/open actions.
12. User marks sessions/activities complete; completion state is persisted and reflected in plan progress.
13. User saves session/activity notes and completion state outside immutable plan JSON.
14. User submits tweak request (target week or whole plan + requested change).
15. Backend sends to LLM:
   - discipline-specific coaching context file
   - current plan JSON
   - tweak request text
   - scope (`week` or `whole_plan`)
   - target week (if scope is week)
   - schema and safety constraints
16. LLM returns:
   - tweaked plan JSON (or unchanged plan JSON)
   - short change summary explaining what was adjusted (or why unchanged)
17. Backend validates JSON and saves as new plan version with tweak metadata.
18. Completed sessions in source version are locked/preserved and cannot be modified by tweaks.
19. Chat history is carried forward to the new version's default chat thread after tweak apply.
20. System runs additional completion/log carry-forward mapping from prior version (future expansion).
21. UI shows updated plan plus LLM change summary.
22. In plan-chat UI, user asks questions about their plan (without auto-editing).
23. Backend sends to LLM:
   - discipline-specific coaching context file
   - selected plan/version JSON
   - recent chat history
   - latest user question
24. LLM returns chat response with coaching explanation/recommendations.
   - responses can reference stored completion and note context
25. If user chooses "Apply suggestion", system creates a formal tweak request and follows tweak flow.
26. User can soft-delete plan from dashboard; plan is hidden from active flows but retained in database.

## Non-Functional Requirements
- Performance: Initial plan generation < 20 seconds target
- Reliability: Validation + retry for malformed LLM output; resilient API error handling
- Security: Secure auth sessions, encrypted secrets, API key protection
- Usability: Primary flows are fully usable on common mobile and desktop viewport sizes
- Observability: Structured logs for generation failures and plan save events
- Observability: Structured logs for generation failures, plan save events, and completion updates
- Observability: Structured logs for tweak requests, validation failures, and accepted/rejected tweak outputs
- Observability: Structured logs for plan chat interactions and apply-from-chat conversion rate

## Open Questions
- LLM provider and model for cost/quality balance?
- When should Stripe be added after MVP validation?
- Regeneration limits for free users before billing is introduced?
