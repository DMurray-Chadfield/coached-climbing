import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions";
import { getEnv } from "@/lib/env";
import { trainingPlanJsonSchema, validateTrainingPlan } from "@/lib/schemas/training-plan";
import type { PlanDiscipline } from "@/lib/services/training-context";
import {
  loadTrainingContext,
  resolvePlanDiscipline
} from "@/lib/services/training-context";

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
  planDiscipline?: PlanDiscipline;
  lockedCompletedSessions?: Array<{
    weekNumber: number;
    sessionNumber: number;
  }>;
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

export function buildTweakMessages(params: {
  trainingContext: string;
  planJson: Record<string, unknown>;
  requestText: string;
  scope: TweakScope;
  targetWeekNumber?: number;
  lockedCompletedSessions?: Array<{
    weekNumber: number;
    sessionNumber: number;
  }>;
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

  if (params.lockedCompletedSessions && params.lockedCompletedSessions.length > 0) {
    basePayload.locked_completed_sessions = params.lockedCompletedSessions.map((session) => ({
      week_number: session.weekNumber,
      session_number: session.sessionNumber
    }));
  }

  const baseMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: params.trainingContext
    },
    {
      role: "system",
      content: [
        "You are a conservative climbing coach making a precise edit to an existing plan.",
        "Return JSON only and match the schema exactly (no markdown, no extra text).",
        "Respect injuries/constraints; keep progression realistic; use session_number (no weekdays).",
        "Do not introduce new equipment not implied by current_plan and training context.",
        "Do not modify locked_completed_sessions.",
        'Scope: if scope="week" and target_week_number is set, only modify that week; all other weeks must remain identical to current_plan (content + ordering).',
        'If scope="whole_plan", edit only what the request requires (no rewrites).',
        "Structure: every session has Warm-up + Cool-down and includes Hangboard/Fingerboard OR Conditioning/Strength; 3+ sessions/week => at least 3 climbing sessions, else every session includes climbing.",
        "Ordering: hangboard before climbing; power-endurance before sustained route-sim when both exist.",
        "Any edited text must include objective + workload + intensity cue + dosage + rest + stop/scale rule.",
        "Use null (not empty strings) for optional fields like intensity/completion_criteria when unknown.",
        "Stability: preserve week_number/session_number; keep existing activity_id when possible; new activities get new unique activity_id (prefer appending w{week}_s{session}_a{next}).",
        "Set changed=true only for meaningful changes; if no change needed, return updated_plan identical to current_plan and changed=false; change_summary must be specific."
      ].join(" ")
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asPositiveInt(value: unknown): number | null {
  if (!Number.isInteger(value)) {
    return null;
  }

  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function preserveCompletedSessions(
  sourcePlan: Record<string, unknown>,
  updatedPlan: Record<string, unknown>,
  lockedCompletedSessions: Array<{ weekNumber: number; sessionNumber: number }>
): Record<string, unknown> {
  if (lockedCompletedSessions.length === 0) {
    return updatedPlan;
  }

  const sourceWeeks = Array.isArray(sourcePlan.weeks) ? sourcePlan.weeks : [];
  const updated = cloneJson(updatedPlan);
  const updatedWeeks = Array.isArray(updated.weeks) ? updated.weeks : [];

  const sourceSessionByKey = new Map<string, Record<string, unknown>>();
  const sourceWeekByNumber = new Map<number, Record<string, unknown>>();

  for (const week of sourceWeeks) {
    if (!isRecord(week) || !Array.isArray(week.sessions)) {
      continue;
    }

    const weekNumber = asPositiveInt(week.week_number);
    if (!weekNumber) {
      continue;
    }

    sourceWeekByNumber.set(weekNumber, week);

    for (const session of week.sessions) {
      if (!isRecord(session)) {
        continue;
      }

      const sessionNumber = asPositiveInt(session.session_number);
      if (!sessionNumber) {
        continue;
      }

      sourceSessionByKey.set(`${weekNumber}:${sessionNumber}`, session);
    }
  }

  for (const locked of lockedCompletedSessions) {
    const key = `${locked.weekNumber}:${locked.sessionNumber}`;
    const sourceSession = sourceSessionByKey.get(key);

    if (!sourceSession) {
      continue;
    }

    let targetWeek = updatedWeeks.find((week) => {
      if (!isRecord(week)) {
        return false;
      }

      return asPositiveInt(week.week_number) === locked.weekNumber;
    }) as Record<string, unknown> | undefined;

    if (!targetWeek) {
      const sourceWeek = sourceWeekByNumber.get(locked.weekNumber);
      if (!sourceWeek) {
        continue;
      }

      targetWeek = cloneJson(sourceWeek);
      updatedWeeks.push(targetWeek);
    }

    if (!Array.isArray(targetWeek.sessions)) {
      targetWeek.sessions = [];
    }

    const targetSessions = targetWeek.sessions as unknown[];
    const existingSessionIndex = targetSessions.findIndex((session) => {
      if (!isRecord(session)) {
        return false;
      }

      return asPositiveInt(session.session_number) === locked.sessionNumber;
    });

    if (existingSessionIndex >= 0) {
      targetSessions[existingSessionIndex] = cloneJson(sourceSession);
      continue;
    }

    targetSessions.push(cloneJson(sourceSession));
  }

  updated.weeks = updatedWeeks;
  return updated;
}

export function buildTweakOpenAIRequest(
  model: string,
  messages: ChatCompletionMessageParam[]
): ChatCompletionCreateParamsNonStreaming {
  const request: ChatCompletionCreateParamsNonStreaming & {
    reasoning_effort?: "low";
  } = {
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

  if (model === "gpt-5.2") {
    request.reasoning_effort = "low";
  }

  return request;
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
  const discipline = resolvePlanDiscipline({
    explicitDiscipline: input.planDiscipline,
    planJson: input.planJson
  });
  const context = await loadTrainingContext(discipline);

  let correctionFeedback: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const messages = buildTweakMessages({
      trainingContext: context,
      planJson: input.planJson,
      requestText: input.requestText,
      scope: input.scope,
      targetWeekNumber: input.targetWeekNumber,
      lockedCompletedSessions: input.lockedCompletedSessions,
      correctionFeedback
    });

    const request = buildTweakOpenAIRequest(env.OPENAI_MODEL_PRIMARY, messages);

    try {
      const completion = await client.chat.completions.create(request);
      const content = completion.choices[0]?.message?.content;
      const payload = parseModelResponse(content);
      const parsed = parseTweakPayload(payload);
      const protectedPlan = preserveCompletedSessions(
        input.planJson,
        parsed.updatedPlan,
        input.lockedCompletedSessions ?? []
      );
      const validation = validateTrainingPlan(protectedPlan);

      if (validation.valid) {
        return {
          updatedPlanJson: protectedPlan,
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
