# Manual Smoke Checklist (Slice 1)

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
- Current plan JSON displays without rendering errors.

## Responsive
- Login, signup, onboarding, dashboard, plan detail are usable on mobile width (~390px).
- Same pages are usable on desktop width (>=1280px).
