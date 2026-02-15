# Architecture

## Overview
Web application that collects climber profile data, sends structured inputs to an LLM with coaching context, validates returned JSON, stores plans, and renders them in a weekly training interface where users can mark sessions and session activities complete. A separate plan-chat area lets users ask questions about their plan without necessarily modifying it.

## Components
- Frontend:
  - Next.js app (marketing + authenticated dashboard)
  - Authenticated homepage that lists existing plans and provides "Create Plan"
  - Concise onboarding questionnaire (session-count based, plus final notes box), plan viewer UI, and activity completion checkboxes
  - Responsive UI for mobile and desktop across dashboard, plan viewer, tweak flow, and plan chat
- Backend:
  - API routes/server actions for auth-protected operations
  - Plan generation service (prompt assembly, LLM call, schema validation, retry)
  - Activity/session completion endpoints (toggle complete/incomplete, list completion state)
  - Activity log endpoints (save stats + feelings, list history)
  - Plan tweak endpoints (week-specific or whole-plan tweak requests)
  - Plan chat endpoints (Q&A about a selected plan/version, optional "apply as tweak")
- Data:
  - PostgreSQL (users, questionnaires, plans, plan versions, activity completions, session completions, activity logs)
  - JSONB column for plan payload (`week -> session -> activities`)
- Runtime:
  - Docker Compose services for `web`, `db`, and `proxy` in local/staging/production
- Integrations:
  - LLM provider API (OpenAI) for plan generation
  - Future: Stripe for subscriptions and webhook events

## LLM Context Loading Rule
- Every LLM call must start with the full coaching context from `/Users/Student/src/tomteece.github.io/training info/training-ideas.md`.
- Applies to:
  - initial plan generation
  - plan tweak requests
  - plan chat responses
- Every plan-generation/tweak call must request structured output from OpenAI API:
  - `response_format.type = json_schema`
  - `json_schema.strict = true`
- Prompt assembly order:
  1. System/base context from `training-ideas.md`
  2. Safety and output constraints
  3. User/plan-specific payload (questionnaire, plan JSON, request/chat message)

## Data Flow
1. User signs up, logs in, and starts onboarding questionnaire.
2. Questionnaire responses are saved to database.
3. User triggers "Generate Plan".
4. Backend assembles prompt using:
   - user questionnaire data
   - climbing-coaching rules/context you provide
   - weekly session count (Session 1..N) instead of fixed weekdays
   - requirement that each session includes a short `description` (reason, goals, target effort)
   - required JSON schema
5. LLM returns candidate JSON plan.
6. Backend validates plan against schema (server-side validation even when structured output is enabled).
7. If invalid, backend retries with correction prompt.
8. Valid plan is saved as a new plan record (or new version, based on user action).
9. Homepage refresh shows all user plans, newest first, with open/edit actions.
10. User marks sessions/activities complete; completion state is persisted and reflected in plan progress.
11. User logs stats/feelings per activity via app UI/backend prompt text (outside LLM plan JSON).
12. User submits tweak request (target week or whole plan + requested change).
13. Backend sends to LLM:
   - base coaching context from `training-ideas.md`
   - current plan JSON
   - tweak request text
   - scope (`week` or `whole_plan`)
   - target week (if scope is week)
   - schema and safety constraints
14. LLM returns:
   - tweaked plan JSON (or unchanged plan JSON)
   - short change summary explaining what was adjusted (or why unchanged)
15. Backend validates JSON and saves as new plan version with tweak metadata.
16. System runs completion/log carry-forward mapping from prior version:
   - copy high-confidence matches
   - skip low-confidence matches (no automatic carry-forward)
17. UI shows updated plan plus LLM change summary.
18. In separate plan-chat UI, user asks questions about their plan (without auto-editing).
19. Backend sends to LLM:
   - base coaching context from `training-ideas.md`
   - selected plan/version JSON
   - recent chat history
   - latest user question
20. LLM returns chat response with coaching explanation/recommendations.
   - responses can reference user-recorded activity stats/feelings from activity logs
21. If user chooses "Apply suggestion", system creates a formal tweak request and follows tweak flow.

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
