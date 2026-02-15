import { describe, expect, it } from "vitest";
import { buildOpenAIRequest } from "@/lib/services/plan-generator";

describe("buildOpenAIRequest", () => {
  it("enforces structured output with strict json schema", () => {
    const request = buildOpenAIRequest("gpt-5-mini", [
      {
        role: "system",
        content: "context"
      }
    ]);

    expect(request.response_format).toBeDefined();
    expect(request.response_format?.type).toBe("json_schema");
    if (request.response_format?.type !== "json_schema") {
      throw new Error("Expected json_schema response format");
    }
    expect(request.response_format.json_schema.strict).toBe(true);
    expect(request.response_format.json_schema.name).toBe("training_plan");
  });

  it("sets low reasoning effort for gpt-5.2", () => {
    const request = buildOpenAIRequest("gpt-5.2", [
      {
        role: "system",
        content: "context"
      }
    ]);

    expect((request as { reasoning_effort?: string }).reasoning_effort).toBe("low");
  });

  it("does not set reasoning effort for other models", () => {
    const request = buildOpenAIRequest("gpt-5-mini", [
      {
        role: "system",
        content: "context"
      }
    ]);

    expect((request as { reasoning_effort?: string }).reasoning_effort).toBeUndefined();
  });
});
