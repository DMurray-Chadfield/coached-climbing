# Deployment Runbook

## Goal
Ship safely with a predictable staging -> production workflow.

## Recommended Deployment Topology
- Cloud target: GCP VM (target profile: `e2-micro` for MVP)
- App: containerized Next.js service
- Database: containerized PostgreSQL instance
- Reverse proxy + TLS: Caddy or Nginx
- Process/runtime: Docker Compose on VM

## Environments
- `local`: developer machine
- `staging`: production-like environment for final validation
- `production`: live environment

## Deployment Flow
1. Merge to main.
2. CI runs tests.
3. Deploy to staging.
4. Run smoke tests on staging:
   - auth
   - plan generation
   - activity completion
   - tweak flow
   - chat flow
5. Promote same image/tag to production.
6. Run production smoke tests and monitor logs/errors.

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
- Environment secrets present and valid.
- OpenAI key configured and reachable.
- Rollback plan confirmed.

## Rollback Strategy
- App rollback: deploy previous stable image tag.
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
