import { describe, expect, it } from "vitest";
import { questionnaireSchema } from "@/lib/schemas/questionnaire";

describe("questionnaireSchema", () => {
  it("accepts a valid questionnaire", () => {
    const result = questionnaireSchema.safeParse({
      age: 29,
      sex: "Male",
      plan_length_weeks: 12,
      target_event: {
        type: "Outdoor trip",
        date: "2026-06-15"
      },
      current_level: {
        boulder_grade: "V4",
        route_grade: "5.11a",
        context_notes: "Mostly indoor"
      },
      goals: ["Improve finger strength"],
      training_history_and_load: {
        recent_training_summary: "3 sessions/week for 2 months",
        past_exercises: ["Hangboarding"],
        load_tolerance: "Moderate"
      },
      sessions_per_week: 3,
      injuries_and_constraints: "Avoid max hangs",
      notes: "Travel some weekends"
    });

    expect(result.success).toBe(true);
  });

  it("rejects out-of-range plan length", () => {
    const result = questionnaireSchema.safeParse({
      age: 29,
      sex: "Male",
      plan_length_weeks: 99,
      current_level: {},
      goals: ["Goal"],
      training_history_and_load: {
        recent_training_summary: "summary",
        past_exercises: [],
        load_tolerance: "Moderate"
      },
      sessions_per_week: 3,
      injuries_and_constraints: "None",
      notes: ""
    });

    expect(result.success).toBe(false);
  });
});
