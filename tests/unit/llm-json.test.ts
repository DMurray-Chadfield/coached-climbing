import { describe, expect, it } from "vitest";
import { parseJsonLenient } from "@/lib/services/llm/json";

describe("parseJsonLenient", () => {
  it("parses fenced JSON", () => {
    const result = parseJsonLenient("```json\n{\"a\":1}\n```");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected ok result");
    }
    expect(result.value).toEqual({ a: 1 });
  });

  it("extracts first JSON object when extra text is present", () => {
    const result = parseJsonLenient("Here you go:\n{\"a\":1}\nThanks!");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected ok result");
    }
    expect(result.value).toEqual({ a: 1 });
  });
});

