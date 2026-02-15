import { describe, expect, it } from "vitest";
import { questionnaireSchema } from "@/lib/schemas/questionnaire";

describe("questionnaireSchema", () => {
  it("accepts a valid questionnaire", () => {
    const result = questionnaireSchema.safeParse({
      plan_discipline: "sport_trad",
      age: 29,
      plan_length_weeks: 12,
      target_focus: {
        summary: "Outdoor trip prep and improve power endurance",
        date: "2026-06-15"
      },
      current_level_summary: "Boulder V4, route 5.11a, mostly indoor",
      training_history_and_load: {
        recent_training_summary: "3 sessions/week for 2 months"
      },
      facilities_and_equipment_available: "Commercial climbing gym, hangboard, pull-up bar",
      sessions_per_week: 3,
      injuries_and_constraints: "Avoid max hangs",
      notes: "Travel some weekends"
    });

    expect(result.success).toBe(true);
  });

  it("rejects out-of-range plan length", () => {
    const result = questionnaireSchema.safeParse({
      plan_discipline: "bouldering",
      age: 29,
      plan_length_weeks: 99,
      target_focus: {
        summary: "Performance push"
      },
      current_level_summary: "V4/5.11a",
      training_history_and_load: {
        recent_training_summary: "summary"
      },
      facilities_and_equipment_available: "Commercial climbing gym",
      sessions_per_week: 3,
      injuries_and_constraints: "None",
      notes: ""
    });

    expect(result.success).toBe(false);
  });

  it("rejects negative climbing age", () => {
    const result = questionnaireSchema.safeParse({
      plan_discipline: "bouldering",
      age: -1,
      plan_length_weeks: 8,
      target_focus: {
        summary: "Technique block"
      },
      current_level_summary: "V3/5.10d",
      training_history_and_load: {
        recent_training_summary: "2 sessions/week"
      },
      facilities_and_equipment_available: "Gym + hangboard",
      sessions_per_week: 3,
      injuries_and_constraints: "None",
      notes: ""
    });

    expect(result.success).toBe(false);
  });
});
