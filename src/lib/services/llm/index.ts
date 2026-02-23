import { getEnv } from "@/lib/env";
import type { LlmClient } from "@/lib/services/llm/client";
import { GeminiLlmClient } from "@/lib/services/llm/providers/gemini";
import { OpenAiLlmClient } from "@/lib/services/llm/providers/openai";

export function getLlmClientFromEnv(): { client: LlmClient; model: string } {
  const env = getEnv();
  if (env.LLM_PROVIDER === "gemini") {
    return {
      client: new GeminiLlmClient(env.GEMINI_API_KEY),
      model: env.GEMINI_MODEL_PRIMARY
    };
  }

  return {
    client: new OpenAiLlmClient(env.OPENAI_API_KEY ?? ""),
    model: env.OPENAI_MODEL_PRIMARY
  };
}
