import { describe, expect, it } from "vitest";
import { buildGenerationMessages } from "@/lib/services/prompt-builder";

describe("buildGenerationMessages", () => {
  it("prepends full training context as the first system message", () => {
    const messages = buildGenerationMessages({
      trainingContext: "TRAINING_CONTEXT_BLOCK",
      questionnaire: {
        age: 29,
        plan_length_weeks: 12,
        target_focus: {
          summary: "Trip prep and strength goals"
        },
        current_level_summary: "Boulder V4, route 5.11a, mostly indoor",
        training_history_and_load: {
          recent_training_summary: "Some training"
        },
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
    expect(messages[2]?.role).toBe("user");
  });
});
