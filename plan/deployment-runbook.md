# Deployment Runbook

## Goal
Ship safely with a predictable manual production workflow on GCP Compute.

## Recommended Deployment Topology
- Cloud target: GCP VM (target profile: `e2-micro` for MVP)
- App: containerized Next.js service
- Database: containerized PostgreSQL instance
- Reverse proxy + TLS: Caddy or Nginx
- Process/runtime: Docker Compose on VM

## Environments
- `local`: developer machine
- `production`: live environment

## Deployment Flow
1. Merge to main.
2. Run launch preflight locally:
   - `pnpm test:release-check`
   - `pnpm prisma:migrate:status`
3. On VM: pull latest code and confirm `.env.local`.
4. Take DB backup snapshot/dump before migration.
5. Apply migrations:
   - `pnpm prisma:migrate:deploy`
   - `pnpm release:verify:migrations`
6. Start/update services:
   - `docker compose up --build -d`
7. Run production smoke tests:
   - auth
   - plan generation
   - activity completion
   - tweak flow
   - chat flow
8. Monitor logs/errors and key metrics for 24h.

## Container Strategy
- Run all services in Docker Compose:
  - `web` (Next.js)
  - `db` (Postgres)
  - `proxy` (Caddy/Nginx)
- Use pinned image tags for reproducibility.
- Prefer building app image in CI and deploying image tags to VM.

## Release Checklist
- Migrations prepared and reviewed.
- Backup taken before production migration.
- `_prisma_migrations` status verified before and after migration.
- Environment secrets present and valid.
- OpenAI key configured and reachable.
- Rollback plan confirmed.

## Rollback Strategy
- App rollback: redeploy previous stable image tag/commit.
- DB rollback:
  - preferred: forward-fix migration
  - emergency: restore from pre-release backup
- If app rollback only is needed, ensure backward DB compatibility for at least one release.

## Monitoring and Alerts
- Capture:
  - API error rate
  - LLM request failures
  - migration failures
  - DB health (connections, disk, CPU)
- Alert on:
  - sustained 5xx spikes
  - repeated LLM schema validation failures
  - webhook/async job failures (future billing phase)

## e2-micro Operating Notes
- Keep service count minimal and avoid non-essential background workers.
- Add swap on host to reduce OOM risk.
- Configure conservative app concurrency.
- Watch memory and disk closely during first weeks after launch.

## Security Basics
- Keep secrets in environment variables, never in repo.
- Restrict DB network access to trusted hosts.
- Enforce HTTPS only.
- Rotate API keys periodically.
