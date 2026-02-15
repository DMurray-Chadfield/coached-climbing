import { describe, expect, it } from "vitest";
import { buildPlanChatMessages } from "@/lib/services/plan-chat";

describe("plan-chat service", () => {
  it("builds chat messages with context, plan JSON, and history", () => {
    const messages = buildPlanChatMessages({
      trainingContext: "TRAINING_CONTEXT",
      planJson: {
        plan_name: "Test",
        start_date: "2026-02-15",
        weeks: []
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
    expect(messages[3]).toEqual({
      role: "user",
      content: "How should I pace this week?"
    });
    expect(messages[4]).toEqual({
      role: "assistant",
      content: "Keep intensity moderate in session 1."
    });
    expect(messages[5]).toEqual({
      role: "user",
      content: "What if my finger feels sore?"
    });
  });
});
