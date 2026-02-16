import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiLlmClient } from "@/lib/services/llm/providers/gemini";

describe("GeminiLlmClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("concatenates system messages into systemInstruction", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "ok" }]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new GeminiLlmClient("test-key");
    await client.complete({
      model: "gemini-2.5-pro",
      mode: { kind: "text" },
      messages: [
        { role: "system", content: "SYS_1" },
        { role: "system", content: "SYS_2" },
        { role: "user", content: "Hello" }
      ]
    });

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body) as { systemInstruction?: { parts?: Array<{ text?: string }> } };
    expect(body.systemInstruction?.parts?.[0]?.text).toContain("SYS_1\n\nSYS_2");
  });

  it("requests JSON output via responseMimeType when mode is json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "{\"ok\":true}" }]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new GeminiLlmClient("test-key");
    const result = await client.complete({
      model: "gemini-2.5-pro",
      mode: { kind: "json", schemaName: "x", schema: { type: "object" } },
      messages: [{ role: "user", content: "Return JSON" }]
    });

    expect(result.text).toBe("{\"ok\":true}");

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body) as { generationConfig?: { responseMimeType?: string } };
    expect(body.generationConfig?.responseMimeType).toBe("application/json");
  });
});

