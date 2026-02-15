# Milestones

## Milestone 1: Discovery
- Goal: Define MVP and technical foundation
- Deliverables:
  - Finalized product requirements
  - Data model + JSON schema draft
  - OpenAI integration plan and cost guardrails
- Exit Criteria:
  - Requirements approved
  - Architecture documented
  - MVP backlog prioritized

## Milestone 2: Build
- Goal: Implement core app and generation pipeline
- Deliverables:
  - Auth + user account pages
  - Onboarding questionnaire
  - LLM plan generation + validation/retry
  - Plan storage + viewer UI
  - LLM plan tweak flow (week-level and whole-plan) with change summaries
  - Separate plan chat flow with optional "apply as tweak"
- Exit Criteria:
  - End-to-end plan generation works for test users
  - JSON plans are persisted and readable in UI
  - End-to-end tweak request returns validated updated (or unchanged) plan + explanation
  - End-to-end plan chat works without mutating plans unless user explicitly applies a tweak
  - Unit + integration test suites implemented and passing in CI
  - Manual smoke test checklist implemented and passing for desktop + mobile viewports

## Milestone 3: Launch
- Goal: Release MVP publicly for free/early-access users
- Deliverables:
  - Basic analytics/events
  - User feedback loop for plan quality
- Exit Criteria:
  - User can sign up and generate plan reliably in production
  - Production environment stable for first users
  - Early usage data collected for monetization decisions
  - Release blocked unless CI tests pass and staging smoke tests succeed

## Milestone 4: Post-Launch
- Goal: Monetization + retention improvements
- Deliverables:
  - Plan regeneration flow
  - Feedback capture on plan usefulness
  - Prompt tuning based on outcomes
  - Stripe checkout + customer portal
  - Webhooks for subscription state sync
- Exit Criteria:
  - Increased plan adherence metrics
  - Successful subscription flow in production
