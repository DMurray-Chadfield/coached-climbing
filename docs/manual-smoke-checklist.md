# Manual Smoke Checklist (Slices 1-2)

Run this checklist with Docker runtime:
- `docker compose -f docker-compose.dev.yml up --build`

Before running the checklist for release:
- `pnpm test:release-check`
- `pnpm prisma:migrate:status`

## Auth
- Sign up with new email succeeds.
- Login with created account succeeds.
- Logout returns user to login.
- Unauthenticated user cannot open dashboard/onboarding(planId)/plan pages.

## Plan Creation + Onboarding
- Dashboard shows primary `Create Plan` action.
- Clicking `Create Plan` creates a draft and routes to `/onboarding?planId=...`.
- Questionnaire saves successfully for that specific plan and redirects to `/plans/[planId]`.
- Questionnaire requires `Plan Type` (`Sport/Trad` or `Bouldering`).
- Climbing age field accepts whole-number years (mobile + desktop).
- Invalid questionnaire fields are rejected.

## Plan Generation
- Generate plan succeeds for a plan that has completed onboarding.
- Generating a plan without onboarding for that plan shows an error.
- Generation failure returns readable error.

## Plans
- Dashboard lists draft and generated plans newest-first.
- Draft plan row shows onboarding + generate actions.
- Generated plan row shows prominent `Open plan` action.
- Plan detail only available to owner.
- Current plan detail renders sessions/activities and completion controls without errors.
- Deleting a plan from dashboard hides it from dashboard and blocks plan detail/onboarding access.

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
- Chat thread create/list endpoints are owner-scoped and default-thread create is idempotent for a plan version.
- Chat message create/list endpoints are owner-scoped.
- Chat reset endpoint clears thread messages without deleting thread metadata.
- Chat requests do not mutate existing plan JSON versions.
- Chat replies reference onboarding + completion + notes context for the selected plan version.

## Plan Chat UI
- Plan detail shows chat panel above the plan content.
- Sending chat message on `Enter` works; `Shift+Enter` inserts new line.
- Optimistic user message appears immediately, followed by assistant response.
- While waiting for assistant response, typing indicator is visible.
- Failed chat send offers `Retry` and resend succeeds without retyping.
- `Reset chat` clears visible transcript after confirmation.
- `Reset chat` is disabled while send/apply actions are in-flight.
- Assistant messages expose `Apply as tweak`; applying succeeds and shows change summary.
- After apply succeeds, page refreshes to the new current plan version and chat bootstraps the default thread for that version.

## Responsive
- Login, signup, onboarding, dashboard, plan detail are usable on mobile width (~390px).
- Same pages are usable on desktop width (>=1280px).
