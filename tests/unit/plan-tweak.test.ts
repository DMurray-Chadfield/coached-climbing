import { describe, expect, it } from "vitest";
import {
  buildTweakMessages,
  buildTweakOpenAIRequest,
  preserveCompletedSessions
} from "@/lib/services/plan-tweak";

describe("plan-tweak service", () => {
  it("builds tweak messages with context first", () => {
    const messages = buildTweakMessages({
      trainingContext: "TRAINING_CONTEXT",
      planJson: {
        plan_name: "Test",
        start_date: "2026-02-15",
        weeks: []
      },
      requestText: "Reduce volume next week",
      scope: "week",
      targetWeekNumber: 2
    });

    expect(messages[0]).toEqual({
      role: "system",
      content: "TRAINING_CONTEXT"
    });
    expect(messages[1]?.role).toBe("system");
    expect(messages[1]?.content).toContain("Ordering: hangboard before climbing");
    expect(messages[1]?.content).toContain("power-endurance before sustained route-sim");
    expect(messages[1]?.content).toContain("Warm-up + Cool-down");
    expect(messages[1]?.content).toContain("Conditioning/Strength");
    expect(messages[2]?.role).toBe("user");
    expect(typeof messages[2]?.content).toBe("string");
    expect((messages[2]?.content as string).includes("target_week_number")).toBe(true);
  });

  it("enforces strict structured output request for tweaks", () => {
    const request = buildTweakOpenAIRequest("gpt-5-mini", [
      {
        role: "system",
        content: "context"
      }
    ]);
    const responseFormat = request.response_format as {
      type: "json_schema";
      json_schema: { strict: boolean; name: string };
    };

    expect(responseFormat.type).toBe("json_schema");
    expect(responseFormat.json_schema.strict).toBe(true);
    expect(responseFormat.json_schema.name).toBe("training_plan_tweak");
  });

  it("sets low reasoning effort for gpt-5.2 tweak requests", () => {
    const request = buildTweakOpenAIRequest("gpt-5.2", [
      {
        role: "system",
        content: "context"
      }
    ]);

    expect((request as { reasoning_effort?: string }).reasoning_effort).toBe("low");
  });

  it("includes locked completed sessions in tweak payload", () => {
    const messages = buildTweakMessages({
      trainingContext: "TRAINING_CONTEXT",
      planJson: {
        plan_name: "Test",
        start_date: "2026-02-15",
        weeks: []
      },
      requestText: "Adjust week load",
      scope: "whole_plan",
      lockedCompletedSessions: [{ weekNumber: 1, sessionNumber: 2 }]
    });

    expect(typeof messages[2]?.content).toBe("string");
    expect(messages[2]?.content as string).toContain("locked_completed_sessions");
    expect(messages[2]?.content as string).toContain("\"week_number\": 1");
    expect(messages[2]?.content as string).toContain("\"session_number\": 2");
  });

  it("preserves completed sessions from the source plan", () => {
    const sourcePlan = {
      plan_name: "Source",
      start_date: "2026-02-15",
      weeks: [
        {
          week_number: 1,
          focus: "Base",
          sessions: [
            {
              session_number: 1,
              session_type: "Strength",
              description: "Original completed session",
              estimated_minutes: 60,
              activities: [{ activity_id: "a1", name: "Climb", description: "easy", duration_minutes: 30 }]
            },
            {
              session_number: 2,
              session_type: "Power",
              description: "Non-completed source session",
              estimated_minutes: 50,
              activities: [{ activity_id: "a2", name: "Limit", description: "hard", duration_minutes: 20 }]
            }
          ]
        }
      ]
    };

    const updatedPlan = {
      plan_name: "Updated",
      start_date: "2026-02-15",
      weeks: [
        {
          week_number: 1,
          focus: "Tweaked",
          sessions: [
            {
              session_number: 1,
              session_type: "Strength",
              description: "Model changed completed session",
              estimated_minutes: 90,
              activities: [{ activity_id: "a9", name: "Changed", description: "changed", duration_minutes: 90 }]
            },
            {
              session_number: 2,
              session_type: "Power",
              description: "Model changed allowed session",
              estimated_minutes: 45,
              activities: [{ activity_id: "a2", name: "Limit", description: "changed", duration_minutes: 25 }]
            }
          ]
        }
      ]
    };

    const protectedPlan = preserveCompletedSessions(sourcePlan, updatedPlan, [{ weekNumber: 1, sessionNumber: 1 }]);
    const weeks = protectedPlan.weeks as Array<{
      sessions: Array<{ session_number: number; description: string; estimated_minutes: number; activities: Array<{ activity_id: string }> }>;
    }>;
    const completedSession = weeks[0]?.sessions.find((session) => session.session_number === 1);
    const nonCompletedSession = weeks[0]?.sessions.find((session) => session.session_number === 2);

    expect(completedSession?.description).toBe("Original completed session");
    expect(completedSession?.estimated_minutes).toBe(60);
    expect(completedSession?.activities[0]?.activity_id).toBe("a1");
    expect(nonCompletedSession?.description).toBe("Model changed allowed session");
  });
});
