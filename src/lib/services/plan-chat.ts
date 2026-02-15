import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getEnv } from "@/lib/env";

type PlanChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

type GeneratePlanChatReplyInput = {
  planJson: Record<string, unknown>;
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

export function buildPlanChatMessages(params: {
  trainingContext: string;
  planJson: Record<string, unknown>;
  history: PlanChatHistoryItem[];
  userMessage: string;
}): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: params.trainingContext
    },
    {
      role: "system",
      content:
        "You are discussing the user's plan. Explain reasoning clearly. Do not mutate data; provide coaching guidance only."
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
  const context = await loadTrainingContext();

  const messages = buildPlanChatMessages({
    trainingContext: context,
    planJson: input.planJson,
    history: input.history,
    userMessage: input.userMessage
  });

  try {
    const completion = await client.chat.completions.create({
      model: env.OPENAI_MODEL_PRIMARY,
      messages
    });

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
