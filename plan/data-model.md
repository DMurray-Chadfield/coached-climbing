# Data Model

## Core Entities
- User
- Subscription
- QuestionnaireResponse
- TrainingPlan
- TrainingPlanVersion
- ActivityCompletion
- SessionCompletion
- ActivityLogEntry
- PlanTweakRequest
- PlanChatThread
- PlanChatMessage

## Relationships
- One `User` can have many `TrainingPlan` records
- One `TrainingPlan` can have many `TrainingPlanVersion` records
- One `User` can have many `QuestionnaireResponse` records (history allowed)
- One `TrainingPlan` can have many `QuestionnaireResponse` records (plan-scoped onboarding history)
- One `TrainingPlanVersion` can have many `ActivityCompletion` records
- One `TrainingPlanVersion` can have many `SessionCompletion` records
- One `TrainingPlanVersion` can have many `ActivityLogEntry` records
- One `TrainingPlan` can have many `PlanTweakRequest` records
- One `TrainingPlan` can have many `PlanChatThread` records
- One `PlanChatThread` can have many `PlanChatMessage` records

## MVP Onboarding Questions (Concise)
1. Profile: "What is your age?"
2. Plan length: "How long do you want the plan?" (weeks, max 52)
3. Target focus: "What are you training for, and what are your goals for this plan?" (single combined answer, optional target date)
4. Current level summary: "Include your boulder grade, route grade, and any context notes."
5. Training history: "What training have you done recently?"
6. Weekly training frequency: "How many sessions per week can you train?" (store as session count, not fixed weekdays)
7. Injuries + constraints: "Any injuries, pain, or constraints we should plan around?" (merged safety/constraints question)
8. Notes: final free-text box for anything else the coach should know

## Suggested QuestionnaireResponse Shape

```json
{
  "training_plan_id": "plan_abc123",
  "age": 29,
  "plan_length_weeks": 12,
  "target_focus": {
    "summary": "Outdoor trip prep and improve power endurance",
    "date": "2026-06-15"
  },
  "current_level_summary": "Boulder V4, route 5.11a, mostly indoor",
  "training_history_and_load": {
    "recent_training_summary": "3 sessions/week for 2 months"
  },
  "sessions_per_week": 3,
  "injuries_and_constraints": "Mild left ring finger pain, avoid max hangs",
  "notes": "Travel one weekend per month"
}
```

## Questionnaire Scoping Rule
- Onboarding is per-plan, not global.
- Every questionnaire save/load call must include a `planId`.
- Generation must use the most recent questionnaire tied to the selected plan.

## Training Plan JSON Shape (MVP)

```json
{
  "plan_name": "8-week Boulder Strength Block",
  "start_date": "2026-03-02",
  "weeks": [
    {
      "week_number": 1,
      "focus": "Technique + capacity",
      "sessions": [
        {
          "session_number": 1,
          "session_type": "Climbing",
          "description": "Reason: Build movement quality under moderate fatigue. Goals: Improve pacing and foot precision. Effort: RPE 7/10, leave 1-2 quality reps in reserve.",
          "estimated_minutes": 90,
          "activities": [
            {
              "activity_id": "w1s1a1",
              "name": "Warm-up",
              "description": "Progressive mobility and easy traversing",
              "duration_minutes": 20,
              "intensity": "Low"
            }
          ]
        }
      ]
    }
  ]
}
```

## Validation Rules (Initial)
- `weeks` is required and must contain at least 1 week
- Each week must include `week_number` and `sessions`
- Each session must include `session_number`, `session_type`, `description`, and `activities`
- Each activity must include `name` and either `duration_minutes` or clear completion criteria
- Each activity must include stable `activity_id` unique within a plan version
- Reject plans that exceed user-declared time constraints
- Reject plans that conflict with injury constraints provided in onboarding

## Versioning Strategy
- Store each generated plan as immutable versioned JSON
- Keep `current_plan_version_id` on each plan for fast retrieval
- Allow regenerating new versions while preserving history

## Plan Tweak Model
- Tweak requests are stored and auditable; accepted tweaks create a new plan version
- Suggested `PlanTweakRequest` fields:
  - `id`
  - `user_id`
  - `training_plan_id`
  - `source_plan_version_id`
  - `result_plan_version_id` (nullable if rejected/failed)
  - `scope` (`week` | `whole_plan`)
  - `target_week_number` (nullable when scope is `whole_plan`)
  - `request_text`
  - `llm_summary_text`
  - `status` (`pending` | `accepted` | `rejected` | `failed`)
  - `created_at`, `updated_at`

## LLM Tweak Response Contract
- LLM must return structured object with:
  - `updated_plan` (full plan JSON, possibly unchanged)
  - `change_summary` (human-readable explanation)
  - `changed` (boolean)
- Behavior:
  - If `changed=false`, plan may remain identical and summary should explain why
  - All responses must pass the same schema/safety validation as initial generation

## Plan Chat Model
- Chat is separate from tweak flow and does not mutate plan data by default
- Suggested `PlanChatThread` fields:
  - `id`
  - `user_id`
  - `training_plan_id`
  - `plan_version_id`
  - `title`
  - `created_at`, `updated_at`
- Suggested `PlanChatMessage` fields:
  - `id`
  - `thread_id`
  - `role` (`user` | `assistant`)
  - `content`
  - `created_at`
- Optional traceability:
  - `source_tweak_request_id` on a message when user applies a chat suggestion

## LLM Context Source Requirement
- For every LLM call, prepend base coaching context from:
  - `/Users/Student/src/tomteece.github.io/training info/training-ideas-condensed.md`
- If condensed context is unavailable, fallback to:
  - `/Users/Student/src/tomteece.github.io/training info/training-ideas.md`
- Store source metadata per request for debugging:
  - `context_source_path`
  - `context_source_hash` (recommended)

## Structured Output API Requirement
- For plan generation and plan tweak calls, use OpenAI structured output mode:
  - `response_format.type = "json_schema"`
  - `json_schema.name = "training_plan"` (or versioned equivalent)
  - `json_schema.strict = true`
- Still run server-side schema validation before persistence.
- If validation fails, retry once with correction context; otherwise mark request as failed.

## Activity Completion Model
- Store completion state separately from plan JSON (plan versions remain immutable)
- Suggested `ActivityCompletion` fields:
  - `id`
  - `user_id`
  - `training_plan_id`
  - `plan_version_id`
  - `week_number`
  - `session_number`
  - `activity_id`
  - `completed_at` (nullable)
  - `created_at`, `updated_at`
- Uniqueness:
  - unique on (`user_id`, `plan_version_id`, `week_number`, `session_number`, `activity_id`)
- Behavior:
  - Toggling completion updates/clears `completed_at`
  - Completion is user-specific and plan-version-specific

## Session Completion Model
- Suggested `SessionCompletion` fields:
  - `id`
  - `user_id`
  - `training_plan_id`
  - `plan_version_id`
  - `week_number`
  - `session_number`
  - `completed_at` (nullable)
  - `completion_source` (`manual` | `derived_all_activities`)
  - `created_at`, `updated_at`
- Uniqueness:
  - unique on (`user_id`, `plan_version_id`, `week_number`, `session_number`)
- Behavior:
  - Session can auto-complete when all activities are complete
  - User can manually toggle session complete/incomplete
  - Derived completion takes precedence when all activities are complete (`derived_all_activities` overrides manual incomplete)
  - Session completion remains plan-version-specific

## Activity Log Entry Model (Stats + Feelings)
- User-entered stats/feelings are stored outside immutable plan JSON
- Activity logging prompt text is static UI/backend copy (not required in LLM plan JSON)
- Suggested `ActivityLogEntry` fields:
  - `id`
  - `user_id`
  - `training_plan_id`
  - `plan_version_id`
  - `week_number`
  - `session_number`
  - `activity_id`
  - `stats_json` (attempts, duration, RPE, etc.)
  - `feelings_text`
  - `created_at`, `updated_at`
- Behavior:
  - Multiple log entries per activity are allowed (history-friendly)
  - Plan chat can reference these logs for coaching discussion

## Completion/Log Carry-Forward on New Plan Versions
- When a tweak creates a new plan version, run carry-forward mapping:
  - Match old/new activities by (`week_number`, `session_number`, `activity_id`)
  - Copy activity/session completion only for high-confidence matches
  - Copy recent activity logs only for high-confidence matches
- If mapping confidence is low:
  - leave unchecked / not copied
- Keep all prior completions/logs intact on old version for audit history

## Implemented API Endpoints (Slice 2 Foundation)
- `PATCH /api/plans/[planId]/activities/completion`
  - Toggles activity completion by `planVersionId` + (`week_number`, `session_number`, `activity_id`)
  - Idempotent upsert with strict owner + plan-version scoping
- `PATCH /api/plans/[planId]/sessions/completion`
  - Toggles manual session completion by `planVersionId` + (`week_number`, `session_number`)
  - Derived rule enforced when all activities in a session are complete
- `GET /api/plans/[planId]`
  - Returns current plan version plus completion snapshot (plan/session/activity progress)
- `POST /api/plans/[planId]/tweaks`, `GET /api/plans/[planId]/tweaks`
  - Structured-output tweak generation with schema validation + retry
  - Persists tweak requests and creates immutable new plan versions on success
- `POST /api/plans/[planId]/chat/threads`, `GET /api/plans/[planId]/chat/threads`
- `POST /api/plans/[planId]/chat/threads/[threadId]/messages`, `GET /api/plans/[planId]/chat/threads/[threadId]/messages`
  - Owner-scoped plan chat persistence with assistant responses
  - Chat flow does not mutate plan JSON

## Homepage Query Requirements
- List plans for the authenticated user only
- Sort by `updated_at` descending
- Include: `id`, `name`, `goal`, `created_at`, `updated_at`, `current_plan_version_id`, `completion_percent`
- Empty state includes a primary "Create Plan" CTA
