# Decisions Log

Track major decisions and why they were made.

| Date | Decision | Options Considered | Rationale | Owner |
|---|---|---|---|---|
| 2026-02-15 | Use Next.js + TypeScript for full app | Keep static HTML, split frontend/backend stacks | Single stack speeds MVP delivery and keeps product/auth/AI flows cohesive | Team |
| 2026-02-15 | Use self-hosted PostgreSQL with Docker Compose runtime | Managed DB-first approach, non-containerized app | Keeps costs low, enables local/staging/prod parity, supports migration control | Team |
| 2026-02-15 | Deploy MVP on GCP VM (target `e2-micro`) | AWS/Azure entry paths, larger VM sizes | Major cloud with low-cost path suitable for early traffic | Team |
| 2026-02-15 | Defer Stripe to post-MVP | Add billing in MVP | Prioritize validating core coaching value before monetization complexity | Team |
| 2026-02-15 | Prefer OpenAI structured output for generation/tweaks (when provider is OpenAI) | Prompt-only JSON compliance | `response_format: json_schema` with strict mode reduces malformed outputs | Team |
| 2026-02-15 | Testing strategy: unit + integration + manual mobile/desktop smoke tests | Add full E2E automation in MVP | Faster MVP while preserving core quality gates and CI reliability | Team |
| 2026-02-15 | Use discipline-specific training context files (`training-ideas-bouldering.md` and `training-ideas-sport-trad.md`) for LLM calls | Single mixed context file | Reduces prompt noise and keeps advice aligned with selected plan type | Team |
| 2026-02-15 | Keep plan versions immutable; store completion/logs separately | Mutate plan JSON in place | Preserves audit history and prevents completion corruption across plan tweaks | Team |
| 2026-02-15 | Default training context to indoor climbing unless explicitly requested otherwise | Assume outdoor by default, ask every time | Reduces incorrect assumptions and matches most users' available facilities | Team |
| 2026-02-15 | Preserve completed sessions during tweak generation | Allow tweak model to fully rewrite source sessions | Protects user adherence history and prevents retroactive plan churn | Team |
| 2026-02-15 | Carry forward plan chat history across tweak-created versions | Start fresh chat thread on every new version | Maintains continuity of coaching context and user trust | Team |
| 2026-02-15 | Soft-delete plans instead of hard delete | Hard delete all plan-related data | Keeps audit/history intact while hiding deleted plans from active UX | Team |
| 2026-02-16 | Add pluggable LLM provider (Gemini option) | OpenAI-only | Allows swapping providers via `LLM_PROVIDER` while keeping JSON schema validation + retry server-side | Team |
