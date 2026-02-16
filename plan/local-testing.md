# Local Testing Strategy

## Goal
Enable fast, repeatable local development with confidence before deployment.

## Baseline Local Stack
- App: Next.js + TypeScript (Docker)
- DB: PostgreSQL (Docker)
- Reverse proxy: Caddy or Nginx (Docker, optional in local)
- AI: OpenAI or Gemini (dev key via `.env.local`)

## Local Environment Setup
1. Create `.env.local` from `.env.example`.
2. Install dependencies with `pnpm install`.
3. Load env and run migrations from host shell (while the DB container is running):
   - `set -a && source .env.local && set +a`
   - `pnpm prisma:migrate:deploy`
   - `pnpm prisma:generate`
4. Start full stack locally with Docker Compose dev mode (default runtime):
   - `docker compose -f docker-compose.dev.yml up --build`
5. Run tests and manual smoke checks.

## Runtime Default
- Local runtime should use Docker Compose dev mode instead of host `pnpm dev`.
- Standard commands:
  - start: `docker compose -f docker-compose.dev.yml up --build`
  - restart without rebuild: `docker compose -f docker-compose.dev.yml up`
  - stop: `docker compose -f docker-compose.dev.yml down`
  - reset DB volume: `docker compose -f docker-compose.dev.yml down -v`

## Docker Compose Services (Default)
- `web`: Next.js app container
- `db`: Postgres container
- `proxy`: Caddy/Nginx container (optional in local, required in prod)

## Low-Resource Notes (e2-micro Friendly)
- Keep container count minimal.
- Use small memory footprints and conservative concurrency.
- Add swap on host VM.
- Avoid running heavy build jobs on the production VM.

## Recommended Test Layers

## 1) Unit Tests
- Scope: pure business logic
- Examples:
  - prompt builder
  - JSON schema validators
  - progress/completion calculations
  - tweak scope logic (week vs whole plan)
- Run on every commit.

## 2) Integration Tests
- Scope: API routes + DB behavior
- Examples:
  - plan generation request/response validation
  - structured-output enforcement (`response_format: json_schema`, `strict: true`)
  - plan tweak flow persists new version
  - activity completion toggle idempotency
  - chat thread/message persistence
- Use isolated test DB (separate schema or ephemeral DB).

## Local QA Checklist (Manual)
- Desktop and mobile layout checks.
- Core flow smoke tests:
  - signup/login
  - dashboard -> create plan -> onboarding for that plan -> generate plan -> view plan
  - tick off activities and see progress update
  - submit tweak and see summary + updated version
  - chat about plan and optionally apply as tweak
  - verify chat history is retained after tweak-created version rollover
  - verify completed sessions are not changed by tweak output
  - delete plan from dashboard and verify it is hidden from dashboard/detail/onboarding/chat flows
- Empty states and loading states.
- Retry/error states for LLM calls.
- Invalid tweak request handling.
- Ensure chat does not modify plans unless user explicitly applies a tweak.
- Ensure deleted plans return not found in plan-bound API/page routes.

## Pre-Deploy Gate
- All unit + integration tests pass.
- Manual desktop + mobile smoke tests pass.
- Migration up/down tested on local/staging DB.
- No high-severity known bugs.

## Test Policy
- Any new core feature should include:
  - unit tests for core logic
  - integration tests for API + DB behavior
  - manual smoke-test coverage for user-facing critical paths when applicable
- PRs that add core features without tests are not considered done.
