import type { LlmMessage, LlmMode } from "@/lib/services/llm/types";

export class LlmClientError extends Error {
  constructor(
    message: string,
    public readonly provider: "openai" | "gemini",
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export interface LlmClient {
  complete(input: { model: string; messages: LlmMessage[]; mode: LlmMode }): Promise<{ text: string }>;
  completeStream?(
    input: { model: string; messages: LlmMessage[]; mode: LlmMode; signal?: AbortSignal }
  ): AsyncIterable<string>;
}
