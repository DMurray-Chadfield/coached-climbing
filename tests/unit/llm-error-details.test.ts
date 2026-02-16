import { describe, expect, it } from "vitest";
import { normalizeLlmError } from "@/lib/services/llm/error-details";

describe("normalizeLlmError", () => {
  it("preserves nested provider details from wrapped LLM errors", () => {
    const normalized = normalizeLlmError(
      {
        name: "LlmClientError",
        message: "OpenAI request failed",
        provider: "openai",
        details: {
          status: 429,
          code: "rate_limit_exceeded",
          type: "requests",
          request_id: "req_123",
          message: "Rate limit exceeded"
        }
      },
      "Unknown OpenAI error"
    );

    expect(normalized.message).toBe("OpenAI request failed");
    expect(normalized.provider).toBe("openai");
    expect(normalized.status).toBe(429);
    expect(normalized.code).toBe("rate_limit_exceeded");
    expect(normalized.type).toBe("requests");
    expect(normalized.details).toEqual({
      status: 429,
      code: "rate_limit_exceeded",
      type: "requests",
      request_id: "req_123",
      message: "Rate limit exceeded"
    });
  });

  it("returns fallback message for non-object errors", () => {
    const normalized = normalizeLlmError("boom", "Unknown provider error");
    expect(normalized).toEqual({ message: "Unknown provider error" });
  });

  it("captures cause details when present", () => {
    const normalized = normalizeLlmError(
      {
        name: "LlmClientError",
        message: "OpenAI request failed",
        cause: new Error("socket hang up")
      },
      "Unknown OpenAI error"
    );

    expect(normalized.cause).toEqual({
      name: "Error",
      message: "socket hang up"
    });
  });
});
