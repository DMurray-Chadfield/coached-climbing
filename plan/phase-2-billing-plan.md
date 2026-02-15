# Phase 2 Billing Plan

## Goal
Introduce paid subscriptions after MVP validation, without disrupting existing users or core plan-generation reliability.

## Success Criteria
- Users can subscribe, manage billing, and retain access based on subscription status
- Billing state is synchronized reliably via webhooks
- Free users are limited by clear usage caps
- Conversion and churn metrics are tracked

## Scope
- Stripe Checkout integration
- Stripe Customer Portal for self-serve billing management
- Subscription tiers and entitlement checks
- Webhook processing for subscription lifecycle events
- Usage limits for free tier and upgraded limits for paid tier
- Billing analytics events

## Non-Goals
- Multi-provider payments
- Annual invoicing workflows for enterprise
- Complex coupon/promotions engine beyond basic launch needs

## Architecture Changes
- Add billing tables:
  - `subscriptions`
  - `usage_counters`
  - `billing_events` (audit trail)
- Add Stripe identifiers to user/account records:
  - `stripe_customer_id`
  - `stripe_subscription_id`
- Add entitlement middleware:
  - Checks plan limits before plan generation/regeneration
- Add webhook handler:
  - Verify Stripe signatures
  - Idempotent event handling
  - Update subscription state in DB

## Rollout Strategy
1. Internal sandbox testing with Stripe test mode
2. Dogfood with allowlisted users
3. Soft launch paid plans for new users only
4. Migrate existing active free users with grace period
5. Full rollout with monitoring and support runbook

## Data Migration Plan
- Backfill `stripe_customer_id` only when users enter checkout
- Default existing users to free tier entitlement
- Keep historical plan records unchanged
- Add migration scripts with rollback notes

## Security and Reliability
- Store Stripe secrets server-side only
- Enforce webhook signature verification
- Use idempotency keys for checkout/session creation where appropriate
- Retry failed webhook processing with dead-letter logging

## Metrics to Track
- Checkout started
- Checkout completed
- Trial started (if enabled)
- Trial converted
- Subscription canceled
- Payment failed
- Monthly recurring revenue (MRR) trend

## Risks and Mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Incorrect entitlement enforcement | Medium | High | Centralize entitlement checks and add integration tests |
| Webhook race conditions | Medium | High | Idempotent handlers + ordered state transitions |
| Poor conversion from free to paid | Medium | Medium | Improve paywall messaging and value communication |
| Support burden during rollout | Low | Medium | Add billing FAQ and support playbook |

## Implementation Checklist
- [ ] Define pricing tiers and usage limits
- [ ] Create DB migration for billing tables/fields
- [ ] Build Stripe checkout session endpoint
- [ ] Build customer portal endpoint
- [ ] Build and test webhook handler
- [ ] Implement entitlement checks in generation endpoints
- [ ] Add billing UI (upgrade/manage plan)
- [ ] Add analytics events and dashboard queries
- [ ] Run staging smoke test plan (desktop + mobile)
- [ ] Run production soft launch checklist

## Open Decisions
- Free trial duration vs no trial
- Monthly only vs monthly + annual pricing
- Limits by number of plan generations vs advanced feature gating
