# Scope

## In Scope
- Marketing site + app shell
- Email/password authentication
- Onboarding questionnaire (target focus, current level summary, recent training, facilities/equipment available, sessions/week, injury constraints, notes)
- AI-generated training plan output in JSON format
- Plan viewer for week/session/activity structure
- Save and load plans per user
- Soft-delete plans (hide from dashboard/app while retaining records)
- Basic admin/config for coaching prompt and plan-generation rules

## Out of Scope
- Native mobile app
- Responsive mobile web is in scope; native iOS/Android apps are out of scope
- Social features (friends, sharing, messaging)
- Wearable integrations
- Advanced analytics dashboards
- Human coach marketplace
- Multi-language localization (initial launch in English only)
- Paid subscriptions and billing (deferred to post-MVP)

## Assumptions
- Initial release targets individual users, not gyms/teams
- MVP can launch without payments for early testers
- LLM can generate valid structured JSON with schema validation + retry logic
- Coaching logic is primarily prompt-driven at MVP stage

## Constraints
- Time: Fast MVP, target first usable version in 8-12 weeks
- Budget: Keep infra costs low; prioritize lightweight self-hosted infrastructure
- Team: Small team (solo founder + AI coding support)
- Tech: Web-first; must support secure auth and reliable JSON generation, with a Stripe-ready path later
