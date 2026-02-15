# Risks

| Risk | Likelihood | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| LLM returns invalid JSON | Medium | High | Enforce schema validation + retry + fallback error UX | Team | Mitigating (generation implemented) |
| Unsafe training recommendations | Medium | High | Add hard guardrails and explicit constraints in prompt + post-checks | Team | Mitigating (generation constraints added) |
| Stripe integration complexity (post-MVP) delays monetization | Medium | Medium | Keep billing isolated to phase-2 scope with dedicated rollout checklist | Team | Open |
| High LLM cost per plan | Medium | Medium | Track token usage, optimize prompt size, choose cost-effective model | Team | Open |
| Low user conversion to paid | Medium | High | Test pricing, improve onboarding clarity, highlight value quickly | Team | Open |
| Scope creep delays launch | High | Medium | Strict MVP scope and weekly backlog review | Team | Open |

## Notes
- Review cadence: Weekly during build, bi-weekly after launch
- Escalation path: Product risk -> backlog reprioritization -> scope reduction decision
