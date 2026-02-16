import { describe, expect, it } from "vitest";
import { validateTrainingPlan } from "@/lib/schemas/training-plan";

function buildValidPlan() {
  return {
    plan_name: "Valid Plan",
    start_date: "2026-03-01",
    executive_summary: {
      phase_by_phase_weekly_split:
        "Weeks 1-3: Base phase\n- 1 Strength day\n- 1 Power-Endurance day\n- 2 Aerobic days",
      program_snapshot:
        "Goal: Trip prep and strength goals\nDuration: 12 weeks\nFrequency: 3 sessions per week"
    },
    weeks: [
      {
        week_number: 1,
        focus: "Technique + capacity",
        sessions: [
          {
            session_number: 1,
            session_type: "Climbing",
            description: "Build quality movement and base volume",
            estimated_minutes: 90,
            activities: [
              {
                activity_id: "w1_s1_a1",
                name: "Warm-up",
                description: "Progressive movement prep",
                duration_minutes: 15,
                completion_criteria: null,
                intensity: null
              }
            ]
          }
        ]
      }
    ]
  };
}

describe("training plan schema", () => {
  it("accepts a plan with executive summary", () => {
    const validation = validateTrainingPlan(buildValidPlan());
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("rejects plans missing executive_summary", () => {
    const invalid = buildValidPlan();
    delete (invalid as { executive_summary?: unknown }).executive_summary;

    const validation = validateTrainingPlan(invalid);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it("rejects plans with malformed summary phase entries", () => {
    const invalid = buildValidPlan();
    invalid.executive_summary.phase_by_phase_weekly_split = "";

    const validation = validateTrainingPlan(invalid);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
