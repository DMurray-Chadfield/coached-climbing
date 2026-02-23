import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions";
import { LlmClientError, type LlmClient } from "@/lib/services/llm/client";
import type { LlmMessage, LlmMode } from "@/lib/services/llm/types";

const REQUEST_TIMEOUT_MS = 600_000;
const MAX_NETWORK_ATTEMPTS = 1;
const RETRY_BASE_DELAY_MS = 700;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableOpenAIError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    message?: string;
    status?: number;
    code?: string;
    cause?: { code?: string };
  };

  if (typeof candidate.status === "number") {
    return [408, 409, 429, 500, 502, 503, 504].includes(candidate.status);
  }

  const message = (candidate.message ?? "").toLowerCase();
  if (
    message.includes("connection") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("socket")
  ) {
    return true;
  }

  const code = (candidate.code ?? candidate.cause?.code ?? "").toUpperCase();
  return ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"].includes(code);
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
}): (ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming) & { reasoning_effort?: "low" } {
  const request: (ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming) & {
    reasoning_effort?: "low";
  } = {
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
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    this.client = new OpenAI({
      apiKey: integrationKey || apiKey,
      ...(baseURL ? { baseURL } : {})
    });
  }

  async complete(input: { model: string; messages: LlmMessage[]; mode: LlmMode }): Promise<{ text: string }> {
    const request = buildOpenAiRequest({
      model: input.model,
      messages: toOpenAiMessages(input.messages),
      mode: input.mode
    });

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_NETWORK_ATTEMPTS; attempt += 1) {
      try {
        const completion = await this.client.chat.completions.create(request as ChatCompletionCreateParamsNonStreaming, {
          timeout: REQUEST_TIMEOUT_MS
        });

        return {
          text: completion.choices[0]?.message?.content ?? ""
        };
      } catch (error) {
        lastError = error;
        const shouldRetry = attempt < MAX_NETWORK_ATTEMPTS && isRetryableOpenAIError(error);
        if (!shouldRetry) {
          break;
        }

        const delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        console.warn("OpenAI request transient failure, retrying", {
          attempt,
          maxAttempts: MAX_NETWORK_ATTEMPTS,
          delayMs,
          error: normalizeOpenAIError(error)
        });
        await sleep(delayMs);
      }
    }

    throw new LlmClientError("OpenAI request failed", "openai", normalizeOpenAIError(lastError));
  }

  async *completeStream(input: {
    model: string;
    messages: LlmMessage[];
    mode: LlmMode;
    signal?: AbortSignal;
  }): AsyncIterable<string> {
    const request = buildOpenAiRequest({
      model: input.model,
      messages: toOpenAiMessages(input.messages),
      mode: input.mode
    }) as ChatCompletionCreateParamsStreaming;

    const stream = await this.client.chat.completions.create(
      {
        ...request,
        stream: true
      },
      {
        timeout: REQUEST_TIMEOUT_MS,
        ...(input.signal ? { signal: input.signal } : {})
      }
    );

    for await (const chunk of stream) {
      if (input.signal?.aborted) {
        break;
      }

      const delta = chunk.choices?.[0]?.delta?.content ?? "";
      if (delta) {
        yield delta;
      }
    }
  }
}
