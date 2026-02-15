# Manual Smoke Checklist (Slices 1-2)

Run this checklist with Docker runtime:
- `docker compose -f docker-compose.dev.yml up --build`

## Auth
- Sign up with new email succeeds.
- Login with created account succeeds.
- Logout returns user to login.
- Unauthenticated user cannot open dashboard/onboarding(planId)/plan pages.

## Plan Creation + Onboarding
- Dashboard shows primary `Create Plan` action.
- Clicking `Create Plan` creates a draft and routes to `/onboarding?planId=...`.
- Questionnaire saves successfully for that specific plan.
- Invalid questionnaire fields are rejected.

## Plan Generation
- Generate plan succeeds for a plan that has completed onboarding.
- Generating a plan without onboarding for that plan shows an error.
- Generation failure returns readable error.

## Plans
- Dashboard lists draft and generated plans newest-first.
- Draft plan row shows onboarding + generate actions.
- Plan detail only available to owner.
- Current plan detail renders sessions/activities and completion controls without errors.

## Completion Tracking
- Activity checkbox toggles persist after page reload.
- Session checkbox toggles persist after page reload.
- Session completion auto-derives when all activities in that session are complete.
- Plan completion percent and per-session completion percent update after each toggle.
- Attempting completion updates for a non-owned plan/version returns not found.

## Tweak + Chat Foundations (Backend)
- Tweak API accepts valid payloads and returns a new plan version + change summary.
- Invalid tweak payloads are rejected with a readable validation error.
- Tweak history endpoint lists only tweak requests for the authenticated plan owner.
- Chat thread create/list endpoints are owner-scoped.
- Chat message create/list endpoints are owner-scoped.
- Chat requests do not mutate existing plan JSON versions.

## Responsive
- Login, signup, onboarding, dashboard, plan detail are usable on mobile width (~390px).
- Same pages are usable on desktop width (>=1280px).
