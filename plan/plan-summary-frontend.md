# Plan Summary Frontend Spec

## Problem Statement
Current plans are detailed but hard to scan quickly. Users want to see what is in the plan immediately, starting with a phase-by-phase weekly split at the top.

## Final JSON Contract
All newly generated and tweaked plans must include a required top-level `executive_summary` object.

```json
{
  "executive_summary": {
    "phase_by_phase_weekly_split": "Weeks 1-3: Base\\n- 1 Strength day\\n- 1 Power-Endurance day\\nWeeks 4-7: Build\\n- 2 Strength days",
    "program_snapshot": "Goal: Improve climbing performance\\nDuration: 12 weeks\\nFrequency: 4-5 sessions/week\\nConstraints: Left ring finger sensitivity"
  }
}
```

Rules:
- Exactly two summary sections in this order:
  - `phase_by_phase_weekly_split`
  - `program_snapshot`
- both sections are plain text fields (`string`, multi-line allowed).
- Field naming stays snake_case.

## UI Rendering Spec
Location: top of plan detail content (`/plans/[planId]`), before progress tabs/session blocks.

Render order:
1. `Phase-by-Phase Weekly Split`
2. `Program Snapshot`

Display behavior:
- Render phase split text block as provided.
- Render program snapshot text block as provided.

## Legacy Behavior
If `executive_summary` is absent (older stored plan JSON), hide the summary section entirely.
- No derived fallback
- No warning message

## Test Matrix
- Valid plan includes full `executive_summary` and passes schema validation.
- Missing `executive_summary` fails schema validation.
- Missing required nested fields fails schema validation.
- `deload_or_test_notes: null` is accepted.
- Legacy plan without summary still renders plan detail page without runtime errors and without summary card.
- Summary parse guards reject malformed structures safely.
- Summary UI is readable on mobile and desktop.

## Acceptance Criteria
1. Generation and tweak outputs fail validation if `executive_summary` is missing/malformed.
2. Plan detail page shows summary-first content when `executive_summary` exists.
3. Existing plans without summary remain usable and do not show summary UI.
4. This spec is documented in `plan/` before implementation changes.
