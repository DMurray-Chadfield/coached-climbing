import { LlmClientError, type LlmClient } from "@/lib/services/llm/client";
import type { LlmMessage, LlmMode } from "@/lib/services/llm/types";

type GeminiRole = "user" | "model";

type GeminiPart = {
  text: string;
};

type GeminiContent = {
  role: GeminiRole;
  parts: GeminiPart[];
};

type GeminiGenerateContentRequest = {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig?: Record<string, unknown>;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

function normalizeGeminiError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return {
      message: "Unknown Gemini error"
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  return {
    ...error
  };
}

function buildSystemInstruction(messages: LlmMessage[], mode: LlmMode): string | null {
  const systemMessages = messages.filter((message) => message.role === "system").map((message) => message.content);
  const base = systemMessages.length > 0 ? systemMessages.join("\n\n") : null;

  if (mode.kind !== "json") {
    return base;
  }

  const jsonInstruction = [
    "Return JSON only. No markdown. No extra keys.",
    `The JSON must validate against schema name: ${mode.schemaName}.`,
    `Schema (JSON Schema): ${JSON.stringify(mode.schema)}`
  ].join("\n");

  if (!base) {
    return jsonInstruction;
  }

  return `${base}\n\n${jsonInstruction}`;
}

function toGeminiContents(messages: LlmMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      continue;
    }

    const role: GeminiRole = message.role === "assistant" ? "model" : "user";
    contents.push({
      role,
      parts: [{ text: message.content }]
    });
  }

  return contents;
}

function extractText(response: GeminiGenerateContentResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("").trim();
}

export class GeminiLlmClient implements LlmClient {
  constructor(private readonly apiKey: string) {}

  async complete(input: { model: string; messages: LlmMessage[]; mode: LlmMode }): Promise<{ text: string }> {
    const systemInstruction = buildSystemInstruction(input.messages, input.mode);
    const request: GeminiGenerateContentRequest = {
      contents: toGeminiContents(input.messages),
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
      ...(input.mode.kind === "json"
        ? {
            generationConfig: {
              responseMimeType: "application/json"
            }
          }
        : {})
    };

    try {
      const url = new URL(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`
      );
      url.searchParams.set("key", this.apiKey);

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new LlmClientError("Gemini request failed", "gemini", {
          status: res.status,
          statusText: res.statusText,
          body: bodyText
        });
      }

      const json = (await res.json()) as GeminiGenerateContentResponse;
      return { text: extractText(json) };
    } catch (error) {
      if (error instanceof LlmClientError) {
        throw error;
      }
      throw new LlmClientError("Gemini request failed", "gemini", normalizeGeminiError(error));
    }
  }
}

