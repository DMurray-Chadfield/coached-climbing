import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getEnv } from "@/lib/env";
import type { CompletionSnapshot } from "@/lib/services/plan-completion";
import type { NotesSnapshot } from "@/lib/services/plan-notes";
import {
  compactCompletionContext,
  compactNotesContext,
  compactOnboardingContext
} from "@/lib/services/plan-chat-context";
import {
  loadTrainingContext,
  resolvePlanDiscipline
} from "@/lib/services/training-context";

type PlanChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

type GeneratePlanChatReplyInput = {
  onboarding: Record<string, unknown> | null;
  planJson: Record<string, unknown>;
  completion: CompletionSnapshot;
  notes: NotesSnapshot;
  history: PlanChatHistoryItem[];
  userMessage: string;
};

export class PlanChatError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_RESPONSE" | "LLM_FAILURE",
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

export function buildPlanChatMessages(params: {
  trainingContext: string;
  onboarding: Record<string, unknown> | null;
  planJson: Record<string, unknown>;
  completion: CompletionSnapshot;
  notes: NotesSnapshot;
  history: PlanChatHistoryItem[];
  userMessage: string;
}): ChatCompletionMessageParam[] {
  const onboardingContext = compactOnboardingContext(params.onboarding);
  const onboardingSummary = onboardingContext
    ? JSON.stringify(onboardingContext, null, 2)
    : "No onboarding response saved yet for this plan. Ask concise clarifying questions when needed.";
  const completionSummary = JSON.stringify(compactCompletionContext(params.completion), null, 2);
  const notesSummary = JSON.stringify(compactNotesContext(params.notes, params.completion), null, 2);

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: params.trainingContext
    },
    {
      role: "system",
      content:
        "You are discussing the user's plan. Do not mutate plan data. Be a practical, supportive coach and tailor advice to current adherence and notes."
    },
    {
      role: "system",
      content:
        "Response format: 1) Brief assessment (1-2 sentences anchored to current plan/adherence facts) 2) Next session adjustments (numbered, concrete prescriptions with dosage/intensity/rest details and explicit week/session references when available) 3) Safety/constraint callouts (if relevant). Keep it concise and actionable. Avoid generic motivational filler."
    },
    {
      role: "system",
      content: `Onboarding context:\n${onboardingSummary}`
    },
    {
      role: "system",
      content: `Completion context:\n${completionSummary}`
    },
    {
      role: "system",
      content: `Notes context:\n${notesSummary}`
    },
    {
      role: "system",
      content: `Current plan JSON:\n${JSON.stringify(params.planJson, null, 2)}`
    }
  ];

  for (const item of params.history) {
    messages.push({
      role: item.role,
      content: item.content
    });
  }

  messages.push({
    role: "user",
    content: params.userMessage
  });

  return messages;
}

export async function generatePlanChatReply(input: GeneratePlanChatReplyInput): Promise<string> {
  const env = getEnv();
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const discipline = resolvePlanDiscipline({
    onboarding: input.onboarding,
    planJson: input.planJson
  });
  const context = await loadTrainingContext(discipline);

  const messages = buildPlanChatMessages({
    trainingContext: context,
    onboarding: input.onboarding,
    planJson: input.planJson,
    completion: input.completion,
    notes: input.notes,
    history: input.history,
    userMessage: input.userMessage
  });

  try {
    const request: Parameters<typeof client.chat.completions.create>[0] & {
      reasoning_effort?: "low";
    } = {
      model: env.OPENAI_MODEL_PRIMARY,
      messages
    };

    if (env.OPENAI_MODEL_PRIMARY === "gpt-5.2") {
      request.reasoning_effort = "low";
    }

    const completion = await client.chat.completions.create(request);

    const content = completion.choices[0]?.message?.content;

    if (!content || content.trim().length === 0) {
      throw new PlanChatError("Model response content was empty", "INVALID_RESPONSE");
    }

    return content;
  } catch (error) {
    if (error instanceof PlanChatError) {
      throw error;
    }

    throw new PlanChatError("OpenAI request failed", "LLM_FAILURE", normalizeOpenAIError(error));
  }
}
