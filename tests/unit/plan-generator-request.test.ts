import { describe, expect, it } from "vitest";
import { buildOpenAIRequest } from "@/lib/services/plan-generator";

describe("buildOpenAIRequest", () => {
  it("enforces structured output with strict json schema", () => {
    const request = buildOpenAIRequest("gpt-4.1", [
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
});
