# AI Climbing Coach

MVP vertical slice implementation for:
- auth (signup/login/logout)
- per-plan onboarding questionnaire
- OpenAI plan generation with strict JSON schema output
- immutable plan version persistence
- authenticated dashboard + plan detail viewer

## Stack
- Next.js + TypeScript
- Prisma + PostgreSQL
- NextAuth credentials
- OpenAI Chat Completions structured output
- Vitest (unit + integration)

## Local Setup
1. Install Node.js 20+ and pnpm.
2. Copy `.env.example` to `.env.local` and fill secrets.
3. Install deps:
   - `pnpm install`
4. Apply migrations and generate Prisma client:
   - `set -a && source .env.local && set +a`
   - `pnpm exec prisma migrate deploy`
   - `pnpm prisma:generate`
5. Run app stack with Docker dev mode (default runtime):
   - `pnpm docker:dev:build`

## Docker Runtime (Default)
- Dev mode (hot reload):
  - first run/build: `pnpm docker:dev:build`
  - start: `pnpm docker:dev`
  - stop: `pnpm docker:dev:down`
- Prod-like mode (built app container):
  - first run/build: `docker compose up --build`
  - start: `docker compose up`
  - stop: `docker compose down`
  - fresh DB reset: `docker compose down -v`
  - web logs: `docker compose logs -f web`

## Testing
- Required gate:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
- Non-blocking integration lane (for now):
  - `pnpm test:integration`

## Key Requirements Implemented
- Dashboard-first flow with primary `Create Plan` action.
- Onboarding is plan-scoped (`/onboarding?planId=...`).
- Generation is plan-scoped and uses the latest questionnaire for that plan.
- Structured output:
  - `response_format.type = json_schema`
  - `json_schema.strict = true`
- Prompt order:
  1. Discipline-specific context:
     - `/Users/Student/src/tomteece.github.io/training info/training-ideas-bouldering.md`
     - `/Users/Student/src/tomteece.github.io/training info/training-ideas-sport-trad.md`
  2. safety constraints
  3. questionnaire payload
- Server-side schema validation + one retry on failure.
- Immutable plan versions via `TrainingPlanVersion`.
