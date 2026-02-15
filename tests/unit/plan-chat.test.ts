import { describe, expect, it } from "vitest";
import { buildPlanChatMessages } from "@/lib/services/plan-chat";

describe("plan-chat service", () => {
  it("builds chat messages with onboarding, completion, notes, plan JSON, and history", () => {
    const messages = buildPlanChatMessages({
      trainingContext: "TRAINING_CONTEXT",
      onboarding: {
        sessions_per_week: 3
      },
      planJson: {
        plan_name: "Test",
        start_date: "2026-02-15",
        weeks: []
      },
      completion: {
        plan_completion_percent: 25,
        completed_sessions: 1,
        total_sessions: 4,
        completed_activities: 2,
        total_activities: 8,
        sessions: [],
        activities: []
      },
      notes: {
        sessions: [],
        activities: []
      },
      history: [
        {
          role: "user",
          content: "How should I pace this week?"
        },
        {
          role: "assistant",
          content: "Keep intensity moderate in session 1."
        }
      ],
      userMessage: "What if my finger feels sore?"
    });

    expect(messages[0]).toEqual({
      role: "system",
      content: "TRAINING_CONTEXT"
    });
    expect(messages[1]?.role).toBe("system");
    expect(messages[2]?.role).toBe("system");
    expect(messages[3]?.role).toBe("system");
    expect(messages[4]?.role).toBe("system");
    expect(messages[5]?.role).toBe("system");
    expect(messages[6]?.role).toBe("system");
    expect(messages[7]).toEqual({
      role: "user",
      content: "How should I pace this week?"
    });
    expect(messages[8]).toEqual({
      role: "assistant",
      content: "Keep intensity moderate in session 1."
    });
    expect(messages[9]).toEqual({
      role: "user",
      content: "What if my finger feels sore?"
    });

    const coachingGuidance = messages[2]?.content;
    expect(typeof coachingGuidance).toBe("string");
    expect((coachingGuidance as string).toLowerCase()).toContain("brief assessment");
  });
});
