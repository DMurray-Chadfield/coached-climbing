import { describe, expect, it } from "vitest";
import { buildGenerationMessages } from "@/lib/services/prompt-builder";

describe("buildGenerationMessages", () => {
  it("prepends full training context as the first system message", () => {
    const messages = buildGenerationMessages({
      trainingContext: "TRAINING_CONTEXT_BLOCK",
      questionnaire: {
        plan_discipline: "sport_trad",
        age: 29,
        plan_length_weeks: 12,
        target_focus: {
          summary: "Trip prep and strength goals"
        },
        current_level_summary: "Boulder V4, route 5.11a, mostly indoor",
        training_history_and_load: {
          recent_training_summary: "Some training"
        },
        facilities_and_equipment_available: "Commercial gym and hangboard",
        sessions_per_week: 3,
        injuries_and_constraints: "None",
        notes: ""
      }
    });

    expect(messages[0]).toEqual({
      role: "system",
      content: "TRAINING_CONTEXT_BLOCK"
    });
    expect(messages[1]?.role).toBe("system");
    expect(messages[1]?.content).toContain("hangboarding before climbing");
    expect(messages[1]?.content).toContain("Warm-up activity and a Cool-down activity");
    expect(messages[1]?.content).toContain("Hangboard/Fingerboard activity or one Conditioning/Strength activity");
    expect(messages[2]?.role).toBe("user");

    const userPayload = JSON.parse(String(messages[2]?.content)) as {
      questionnaire: Record<string, unknown>;
    };
    expect(userPayload.questionnaire.climbing_age_years).toBe(29);
    expect("age" in userPayload.questionnaire).toBe(false);
  });
});
