import { describe, expect, it } from "vitest";
import { buildTweakMessages, buildTweakOpenAIRequest } from "@/lib/services/plan-tweak";

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
});
