# AI Climbing Coach

MVP vertical slice implementation for:
- auth (signup/login/logout)
- onboarding questionnaire
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
3. Start Postgres with Docker Compose:
   - `docker compose up db -d`
4. Install deps and generate Prisma client:
   - `pnpm install`
   - `pnpm prisma:generate`
5. Apply migrations:
   - `pnpm prisma:migrate:dev`
6. Run app:
   - `pnpm dev`

## Testing
- Required gate:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
- Non-blocking integration lane (for now):
  - `pnpm test:integration`

## Key Requirements Implemented
- Structured output:
  - `response_format.type = json_schema`
  - `json_schema.strict = true`
- Prompt order:
  1. `/Users/Student/src/tomteece.github.io/training info/training-ideas.md`
  2. safety constraints
  3. questionnaire payload
- Server-side schema validation + one retry on failure.
- Immutable plan versions via `TrainingPlanVersion`.
