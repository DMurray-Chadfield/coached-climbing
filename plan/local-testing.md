# Local Testing Strategy

## Goal
Enable fast, repeatable local development with confidence before deployment.

## Baseline Local Stack
- App: Next.js + TypeScript (Docker)
- DB: PostgreSQL (Docker)
- Reverse proxy: Caddy or Nginx (Docker, optional in local)
- AI: OpenAI API (dev key via `.env.local`)

## Local Environment Setup
1. Start full stack locally with Docker Compose.
2. Create `.env.local` from `.env.example`.
3. Run database migrations.
4. Seed minimal dev data (optional).
5. Run tests and manual smoke checks.

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
  - onboarding -> generate plan -> view plan
  - tick off activities and see progress update
  - submit tweak and see summary + updated version
  - chat about plan and optionally apply as tweak
- Empty states and loading states.
- Retry/error states for LLM calls.
- Invalid tweak request handling.
- Ensure chat does not modify plans unless user explicitly applies a tweak.

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
