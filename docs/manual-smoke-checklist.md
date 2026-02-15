# Manual Smoke Checklist (Slice 1)

## Auth
- Sign up with new email succeeds.
- Login with created account succeeds.
- Logout returns user to login.
- Unauthenticated user cannot open dashboard/onboarding/plan pages.

## Onboarding
- Questionnaire saves successfully.
- Invalid questionnaire fields are rejected.

## Plan Generation
- Generate plan succeeds after onboarding.
- Generation failure returns readable error.

## Plans
- Dashboard lists generated plans newest-first.
- Plan detail only available to owner.
- Current plan JSON displays without rendering errors.

## Responsive
- Login, signup, onboarding, dashboard, plan detail are usable on mobile width (~390px).
- Same pages are usable on desktop width (>=1280px).
