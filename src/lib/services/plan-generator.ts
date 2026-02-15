import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions";
import { getEnv } from "@/lib/env";
import type { QuestionnaireInput } from "@/lib/schemas/questionnaire";
import { trainingPlanJsonSchema, validateTrainingPlan } from "@/lib/schemas/training-plan";
import { buildGenerationMessages } from "@/lib/services/prompt-builder";

const MAX_ATTEMPTS = 2;

type PlanGenerationSuccess = {
  planJson: Record<string, unknown>;
  retryCount: number;
};

export class PlanGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_RESPONSE" | "VALIDATION_FAILED" | "LLM_FAILURE",
    public readonly details?: unknown
  ) {
    super(message);
  }
}

async function loadTrainingContext(): Promise<string> {
  const contextPath = path.join(process.cwd(), "training info", "training-ideas.md");
  return readFile(contextPath, "utf8");
}

export function buildOpenAIRequest(
  model: string,
  messages: ChatCompletionMessageParam[]
): ChatCompletionCreateParamsNonStreaming {
  return {
    model,
    temperature: 0.3,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "training_plan",
        strict: true,
        schema: trainingPlanJsonSchema
      }
    }
  };
}

function parseModelResponse(content: string | null | undefined): unknown {
  if (!content) {
    throw new PlanGenerationError("Model response content was empty", "INVALID_RESPONSE");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new PlanGenerationError("Model response was not valid JSON", "INVALID_RESPONSE", {
      content
    });
  }
}

export async function generateTrainingPlan(
  questionnaire: QuestionnaireInput
): Promise<PlanGenerationSuccess> {
  const env = getEnv();
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const context = await loadTrainingContext();

  let correctionFeedback: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const messages = buildGenerationMessages({
      trainingContext: context,
      questionnaire,
      correctionFeedback
    });

    const request = buildOpenAIRequest(env.OPENAI_MODEL_PRIMARY, messages);

    try {
      const completion = await client.chat.completions.create(request);
      const content = completion.choices[0]?.message?.content;
      const parsed = parseModelResponse(content);
      const validation = validateTrainingPlan(parsed);

      if (validation.valid) {
        return {
          planJson: parsed as Record<string, unknown>,
          retryCount: attempt - 1
        };
      }

      correctionFeedback = JSON.stringify(
        {
          errors: validation.errors
        },
        null,
        2
      );

      if (attempt === MAX_ATTEMPTS) {
        throw new PlanGenerationError(
          "Model output failed schema validation after retry",
          "VALIDATION_FAILED",
          validation.errors
        );
      }
    } catch (error) {
      if (error instanceof PlanGenerationError) {
        throw error;
      }
      throw new PlanGenerationError("OpenAI request failed", "LLM_FAILURE", error);
    }
  }

  throw new PlanGenerationError("Unexpected generation failure", "LLM_FAILURE");
}
