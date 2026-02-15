# Decisions Log

Track major decisions and why they were made.

| Date | Decision | Options Considered | Rationale | Owner |
|---|---|---|---|---|
| 2026-02-15 | Use Next.js + TypeScript for full app | Keep static HTML, split frontend/backend stacks | Single stack speeds MVP delivery and keeps product/auth/AI flows cohesive | Team |
| 2026-02-15 | Use self-hosted PostgreSQL with Docker Compose runtime | Managed DB-first approach, non-containerized app | Keeps costs low, enables local/staging/prod parity, supports migration control | Team |
| 2026-02-15 | Deploy MVP on GCP VM (target `e2-micro`) | AWS/Azure entry paths, larger VM sizes | Major cloud with low-cost path suitable for early traffic | Team |
| 2026-02-15 | Defer Stripe to post-MVP | Add billing in MVP | Prioritize validating core coaching value before monetization complexity | Team |
| 2026-02-15 | Require OpenAI structured output for generation/tweaks | Prompt-only JSON compliance | `response_format: json_schema` with strict mode reduces malformed outputs | Team |
| 2026-02-15 | Testing strategy: unit + integration + manual mobile/desktop smoke tests | Add full E2E automation in MVP | Faster MVP while preserving core quality gates and CI reliability | Team |
| 2026-02-15 | Prepend `training info/training-ideas-condensed.md` with fallback to `training-ideas.md` in LLM context | Full context only, partial/optional context loading | Keeps generation context concise while preserving reliability with a fallback path | Team |
| 2026-02-15 | Keep plan versions immutable; store completion/logs separately | Mutate plan JSON in place | Preserves audit history and prevents completion corruption across plan tweaks | Team |
