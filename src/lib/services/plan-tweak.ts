import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions";
import { getEnv } from "@/lib/env";
import { trainingPlanJsonSchema, validateTrainingPlan } from "@/lib/schemas/training-plan";

const MAX_ATTEMPTS = 2;

const tweakResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["updated_plan", "change_summary", "changed"],
  properties: {
    updated_plan: trainingPlanJsonSchema,
    change_summary: {
      type: "string",
      minLength: 1
    },
    changed: {
      type: "boolean"
    }
  }
} as const;

type TweakScope = "week" | "whole_plan";

type GenerateTweakedPlanInput = {
  planJson: Record<string, unknown>;
  requestText: string;
  scope: TweakScope;
  targetWeekNumber?: number;
};

type TweakedPlanResult = {
  updatedPlanJson: Record<string, unknown>;
  changeSummary: string;
  changed: boolean;
  retryCount: number;
};

export class PlanTweakError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_RESPONSE" | "VALIDATION_FAILED" | "LLM_FAILURE",
    public readonly details?: unknown
  ) {
    super(message);
  }
}

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

async function loadTrainingContext(): Promise<string> {
  const condensedContextPath = path.join(process.cwd(), "training info", "training-ideas-condensed.md");
  const fullContextPath = path.join(process.cwd(), "training info", "training-ideas.md");

  try {
    return await readFile(condensedContextPath, "utf8");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return readFile(fullContextPath, "utf8");
    }

    throw error;
  }
}

export function buildTweakMessages(params: {
  trainingContext: string;
  planJson: Record<string, unknown>;
  requestText: string;
  scope: TweakScope;
  targetWeekNumber?: number;
  correctionFeedback?: string;
}): ChatCompletionMessageParam[] {
  const basePayload: Record<string, unknown> = {
    task: "Apply a requested tweak to a climbing training plan while preserving valid JSON schema.",
    scope: params.scope,
    request_text: params.requestText,
    current_plan: params.planJson
  };

  if (params.scope === "week" && typeof params.targetWeekNumber === "number") {
    basePayload.target_week_number = params.targetWeekNumber;
  }

  const baseMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: params.trainingContext
    },
    {
      role: "system",
      content:
        "Respect injury constraints and realistic progression. Keep output strictly aligned to the provided schema. If an activity prescribes sets and reps, include clear rest timing (between reps/sets/rounds as applicable)."
    },
    {
      role: "user",
      content: JSON.stringify(basePayload, null, 2)
    }
  ];

  if (!params.correctionFeedback) {
    return baseMessages;
  }

  return [
    ...baseMessages,
    {
      role: "user",
      content: `The previous output failed validation. Fix exactly:\n${params.correctionFeedback}`
    }
  ];
}

export function buildTweakOpenAIRequest(
  model: string,
  messages: ChatCompletionMessageParam[]
): ChatCompletionCreateParamsNonStreaming {
  return {
    model,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "training_plan_tweak",
        strict: true,
        schema: tweakResponseSchema
      }
    }
  };
}

function parseModelResponse(content: string | null | undefined): Record<string, unknown> {
  if (!content) {
    throw new PlanTweakError("Model response content was empty", "INVALID_RESPONSE");
  }

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new PlanTweakError("Model response was not valid JSON", "INVALID_RESPONSE", {
      content
    });
  }
}

function parseTweakPayload(payload: Record<string, unknown>): {
  updatedPlan: Record<string, unknown>;
  changeSummary: string;
  changed: boolean;
} {
  const updatedPlan = payload.updated_plan;
  const changeSummary = payload.change_summary;
  const changed = payload.changed;

  if (typeof updatedPlan !== "object" || updatedPlan === null || Array.isArray(updatedPlan)) {
    throw new PlanTweakError("Model response missing updated_plan object", "INVALID_RESPONSE", payload);
  }

  if (typeof changeSummary !== "string" || changeSummary.length === 0) {
    throw new PlanTweakError("Model response missing change_summary", "INVALID_RESPONSE", payload);
  }

  if (typeof changed !== "boolean") {
    throw new PlanTweakError("Model response missing changed boolean", "INVALID_RESPONSE", payload);
  }

  return {
    updatedPlan: updatedPlan as Record<string, unknown>,
    changeSummary,
    changed
  };
}

export async function generateTweakedPlan(input: GenerateTweakedPlanInput): Promise<TweakedPlanResult> {
  const env = getEnv();
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const context = await loadTrainingContext();

  let correctionFeedback: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const messages = buildTweakMessages({
      trainingContext: context,
      planJson: input.planJson,
      requestText: input.requestText,
      scope: input.scope,
      targetWeekNumber: input.targetWeekNumber,
      correctionFeedback
    });

    const request = buildTweakOpenAIRequest(env.OPENAI_MODEL_PRIMARY, messages);

    try {
      const completion = await client.chat.completions.create(request);
      const content = completion.choices[0]?.message?.content;
      const payload = parseModelResponse(content);
      const parsed = parseTweakPayload(payload);
      const validation = validateTrainingPlan(parsed.updatedPlan);

      if (validation.valid) {
        return {
          updatedPlanJson: parsed.updatedPlan,
          changeSummary: parsed.changeSummary,
          changed: parsed.changed,
          retryCount: attempt - 1
        };
      }

      correctionFeedback = JSON.stringify(
        {
          errors: validation.errors,
          message: "updated_plan must match the training plan schema exactly"
        },
        null,
        2
      );

      if (attempt === MAX_ATTEMPTS) {
        throw new PlanTweakError(
          "Model output failed schema validation after retry",
          "VALIDATION_FAILED",
          validation.errors
        );
      }
    } catch (error) {
      if (error instanceof PlanTweakError) {
        throw error;
      }

      throw new PlanTweakError("OpenAI request failed", "LLM_FAILURE", normalizeOpenAIError(error));
    }
  }

  throw new PlanTweakError("Unexpected tweak generation failure", "LLM_FAILURE");
}
