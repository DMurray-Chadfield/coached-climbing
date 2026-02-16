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

function nextSseBoundary(buffer: string): { index: number; length: number } | null {
  const lf = buffer.indexOf("\n\n");
  const crlf = buffer.indexOf("\r\n\r\n");

  if (lf === -1 && crlf === -1) {
    return null;
  }

  if (lf !== -1 && (crlf === -1 || lf < crlf)) {
    return { index: lf, length: 2 };
  }

  return { index: crlf, length: 4 };
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

  async *completeStream(input: {
    model: string;
    messages: LlmMessage[];
    mode: LlmMode;
    signal?: AbortSignal;
  }): AsyncIterable<string> {
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
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:streamGenerateContent`
      );
      url.searchParams.set("alt", "sse");
      url.searchParams.set("key", this.apiKey);

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream"
        },
        body: JSON.stringify(request),
        ...(input.signal ? { signal: input.signal } : {})
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new LlmClientError("Gemini request failed", "gemini", {
          status: res.status,
          statusText: res.statusText,
          body: bodyText
        });
      }

      if (!res.body) {
        throw new LlmClientError("Gemini request failed", "gemini", {
          message: "Missing response body"
        });
      }

      const decoder = new TextDecoder();
      const reader = res.body.getReader();
      let buffer = "";
      let lastText = "";

      while (true) {
        if (input.signal?.aborted) {
          break;
        }

        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let boundary = nextSseBoundary(buffer);
        while (boundary) {
          const rawEvent = buffer.slice(0, boundary.index);
          buffer = buffer.slice(boundary.index + boundary.length);

          const dataLines = rawEvent
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart());

          const data = dataLines.join("\n").trim();
          if (!data) {
            boundary = nextSseBoundary(buffer);
            continue;
          }

          if (data === "[DONE]") {
            return;
          }

          let parsed: GeminiGenerateContentResponse | null = null;
          try {
            parsed = JSON.parse(data) as GeminiGenerateContentResponse;
          } catch {
            parsed = null;
          }

          const text =
            parsed?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("")?.trimEnd() ?? "";

          if (text) {
            const delta = text.startsWith(lastText) ? text.slice(lastText.length) : text;
            lastText = text;
            if (delta) {
              yield delta;
            }
          }

          boundary = nextSseBoundary(buffer);
        }
      }
    } catch (error) {
      if (error instanceof LlmClientError) {
        throw error;
      }
      throw new LlmClientError("Gemini request failed", "gemini", normalizeGeminiError(error));
    }
  }
}
