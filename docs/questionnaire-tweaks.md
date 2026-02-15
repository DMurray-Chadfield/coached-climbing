# Questionnaire Tweaks

## Requested Changes
1. Remove `Past Exercises (comma separated)`.
2. Remove `Load Tolerance`.
3. Remove `Goals`.
4. Combine goals intent with target event into one field.
5. Remove `Sex`.
6. Replace `Boulder Grade`, `Route Grade`, and `Current Level Notes` with one combined field asking for all three details.
7. Treat `age` input as climbing age (years climbing) in onboarding and prompt payload.

## New Contract
- `plan_discipline: "bouldering" | "sport_trad"`
- `target_focus: { summary: string, date?: string }`
- `current_level_summary: string`
- `facilities_and_equipment_available: string`
- onboarding is plan-scoped and saved with `planId`
- successful save redirects to `/plans/[planId]`
- onboarding `age` represents climbing years; generation prompt sends `climbing_age_years`

## Implemented In
- [x] `/Users/Student/src/tomteece.github.io/src/lib/schemas/questionnaire.ts`
- [x] `/Users/Student/src/tomteece.github.io/src/components/questionnaire-form.tsx`
- [x] `/Users/Student/src/tomteece.github.io/src/app/onboarding/page.tsx`
- [x] `/Users/Student/src/tomteece.github.io/src/app/api/plans/generate/route.ts`
- [x] `/Users/Student/src/tomteece.github.io/src/app/api/plans/route.ts`
- [x] `/Users/Student/src/tomteece.github.io/tests/unit/questionnaire-schema.test.ts`
- [x] `/Users/Student/src/tomteece.github.io/tests/unit/prompt-builder.test.ts`
- [x] `/Users/Student/src/tomteece.github.io/tests/unit/plan-generator-retry.test.ts`
- [x] `/Users/Student/src/tomteece.github.io/tests/integration/questionnaire-route.test.ts`
- [x] `/Users/Student/src/tomteece.github.io/plan/data-model.md`
- [x] `/Users/Student/src/tomteece.github.io/plan/scope.md`
- [x] `/Users/Student/src/tomteece.github.io/plan/backlog.md`
- [x] `/Users/Student/src/tomteece.github.io/README.md`
- [x] `/Users/Student/src/tomteece.github.io/docs/manual-smoke-checklist.md`
- [x] `/Users/Student/src/tomteece.github.io/plan/architecture.md`
