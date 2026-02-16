import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions";
import { LlmClientError, type LlmClient } from "@/lib/services/llm/client";
import type { LlmMessage, LlmMode } from "@/lib/services/llm/types";

function normalizeOpenAIError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return {
      message: "Unknown OpenAI error"
    };
  }

  const candidate = error as {
    name?: string;
    message?: string;
    status?: number;
    code?: string;
    type?: string;
    error?: { message?: string; type?: string; code?: string };
  };

  return {
    name: candidate.name,
    message: candidate.message ?? candidate.error?.message,
    status: candidate.status,
    code: candidate.code ?? candidate.error?.code,
    type: candidate.type ?? candidate.error?.type
  };
}

function toOpenAiMessages(messages: LlmMessage[]): ChatCompletionMessageParam[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
}

function buildOpenAiRequest(params: {
  model: string;
  messages: ChatCompletionMessageParam[];
  mode: LlmMode;
}): ChatCompletionCreateParamsNonStreaming & { reasoning_effort?: "low" } {
  const request: ChatCompletionCreateParamsNonStreaming & { reasoning_effort?: "low" } = {
    model: params.model,
    messages: params.messages
  };

  if (params.mode.kind === "json") {
    request.response_format = {
      type: "json_schema",
      json_schema: {
        name: params.mode.schemaName,
        strict: true,
        schema: params.mode.schema
      }
    };
  }

  if (params.model === "gpt-5.2") {
    request.reasoning_effort = "low";
  }

  return request;
}

export class OpenAiLlmClient implements LlmClient {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(input: { model: string; messages: LlmMessage[]; mode: LlmMode }): Promise<{ text: string }> {
    try {
      const request = buildOpenAiRequest({
        model: input.model,
        messages: toOpenAiMessages(input.messages),
        mode: input.mode
      });

      const completion = await this.client.chat.completions.create(request);
      return {
        text: completion.choices[0]?.message?.content ?? ""
      };
    } catch (error) {
      throw new LlmClientError("OpenAI request failed", "openai", normalizeOpenAIError(error));
    }
  }
}

