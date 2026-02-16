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

## Deploy (GCP VM / “pull + run”)
If you want to build once (CI/local), push the image, then pull it on a GCP instance and use the instance’s `.env.local`:

1. Build + push an image from your build machine:
   - Docker Hub example:
     - `docker buildx build --platform linux/amd64 -t tomtee/climbing-app:TAG --push .`
2. On the GCP VM, in the repo folder:
   - Create `.env.local` (copy from `.env.example`) and set real secrets.
   - `export WEB_IMAGE="tomtee/climbing-app:TAG"`
   - `docker compose -f docker-compose.prod.yml pull`
   - `docker compose -f docker-compose.prod.yml up -d`
3. To apply changes to `.env.local`: edit it on the VM and restart:
   - `docker compose -f docker-compose.prod.yml up -d --force-recreate web`

## Testing
- Required CI gate:
  - `pnpm test:required-gate`
- Full launch preflight gate (manual deploy requirement):
  - `pnpm test:release-check`
- Integration remains a non-blocking CI lane for now:
  - `pnpm test:integration`

## Key Requirements Implemented
- Dashboard-first flow with primary `Create Plan` action.
- Onboarding is plan-scoped (`/onboarding?planId=...`).
- Onboarding `age` field is climbing age in years.
- Onboarding includes explicit `plan_discipline` selection (`bouldering` or `sport_trad`).
- Onboarding save redirects to the plan page.
- Generation is plan-scoped and uses the latest questionnaire for that plan.
- Soft-delete is supported for plans (hidden from active UI, retained in DB).
- Structured output:
  - `response_format.type = json_schema`
  - `json_schema.strict = true`
- Prompt order:
  1. Discipline-specific context:
     - `/Users/Student/src/tomteece.github.io/training info/training-ideas-bouldering.md`
     - `/Users/Student/src/tomteece.github.io/training info/training-ideas-sport-trad.md`
  2. safety constraints
  3. questionnaire payload (includes `climbing_age_years`)
- Server-side schema validation + one retry on failure.
- Immutable plan versions via `TrainingPlanVersion`.
