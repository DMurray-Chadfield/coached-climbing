import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-guard", () => ({
  requireUserId: vi.fn()
}));

vi.mock("@/lib/services/plan-chat", () => ({
  PlanChatError: class MockPlanChatError extends Error {
    code: "INVALID_RESPONSE" | "LLM_FAILURE";
    details?: unknown;

    constructor(message: string, code: "INVALID_RESPONSE" | "LLM_FAILURE", details?: unknown) {
      super(message);
      this.code = code;
      this.details = details;
    }
  },
  generatePlanChatReply: vi.fn()
}));

vi.mock("@/lib/services/plan-completion", () => ({
  getCompletionSnapshot: vi.fn()
}));

vi.mock("@/lib/services/plan-notes", () => ({
  getNotesSnapshot: vi.fn()
}));

vi.mock("@/lib/services/plan-tweak", () => ({
  PlanTweakError: class MockPlanTweakError extends Error {
    code: "INVALID_RESPONSE" | "VALIDATION_FAILED" | "LLM_FAILURE";
    details?: unknown;

    constructor(
      message: string,
      code: "INVALID_RESPONSE" | "VALIDATION_FAILED" | "LLM_FAILURE",
      details?: unknown
    ) {
      super(message);
      this.code = code;
      this.details = details;
    }
  },
  generateTweakedPlan: vi.fn()
}));

vi.mock("@/lib/services/plan-version-rollover", () => ({
  carryForwardPlanVersionState: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    planChatThread: {
      findFirst: vi.fn()
    },
    planChatMessage: {
      findMany: vi.fn()
    },
    questionnaireResponse: {
      findFirst: vi.fn()
    },
    sessionCompletion: {
      findMany: vi.fn()
    },
    trainingPlanVersion: {
      findFirst: vi.fn()
    },
    trainingPlan: {
      update: vi.fn()
    },
    planTweakRequest: {
      create: vi.fn(),
      update: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

import { requireUserId } from "@/lib/server/auth-guard";
import { prisma } from "@/lib/prisma";
import { generatePlanChatReply } from "@/lib/services/plan-chat";
import { getCompletionSnapshot } from "@/lib/services/plan-completion";
import { getNotesSnapshot } from "@/lib/services/plan-notes";
import { generateTweakedPlan } from "@/lib/services/plan-tweak";
import { carryForwardPlanVersionState } from "@/lib/services/plan-version-rollover";
import { POST as POST_MESSAGES } from "@/app/api/plans/[planId]/chat/threads/[threadId]/messages/route";
import { POST as POST_TWEAKS } from "@/app/api/plans/[planId]/tweaks/route";

describe("chat apply tweak flow", () => {
  const planId = "ckzv3m9ub0000n8p7h9grq2la";
  const threadId = "ckzv3m9ub0001n8p7h9grq2lb";
  const sourceVersionId = "ckzv3m9ub0002n8p7h9grq2lc";
  const nextVersionId = "ckzv3m9ub0003n8p7h9grq2ld";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("supports chat response followed by tweak apply that creates a new current plan version", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.planChatThread.findFirst).mockResolvedValue({
      id: "thread_1",
      trainingPlanId: "plan_1",
      planVersionId: sourceVersionId,
      planVersion: {
        planJson: {
          plan_name: "Initial",
          start_date: "2026-02-15",
          weeks: []
        }
      }
    } as never);
    vi.mocked(prisma.planChatMessage.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.questionnaireResponse.findFirst).mockResolvedValue({
      data: { sessions_per_week: 3, target_focus: { summary: "Power endurance" } }
    } as never);
    vi.mocked(getCompletionSnapshot).mockResolvedValue({
      plan_completion_percent: 20,
      completed_sessions: 1,
      total_sessions: 5,
      completed_activities: 2,
      total_activities: 10,
      sessions: [],
      activities: []
    });
    vi.mocked(getNotesSnapshot).mockResolvedValue({
      sessions: [],
      activities: []
    });
    vi.mocked(generatePlanChatReply).mockResolvedValue("Shift volume to later in the week and reduce intensity by 10%.");
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: (client: any) => Promise<unknown>) =>
      callback({
        planChatMessage: {
          create: vi
            .fn()
            .mockResolvedValueOnce({
              id: "msg_user",
              role: "user",
              content: "How should I tweak this week?",
              sourceTweakRequestId: null,
              createdAt: new Date("2026-02-15T00:00:00.000Z")
            })
            .mockResolvedValueOnce({
              id: "msg_assistant",
              role: "assistant",
              content: "Shift volume to later in the week and reduce intensity by 10%.",
              sourceTweakRequestId: null,
              createdAt: new Date("2026-02-15T00:00:02.000Z")
            })
        },
        planChatThread: {
          update: vi.fn().mockResolvedValue({})
        }
      })
    );

    const chatResponse = await POST_MESSAGES(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "How should I tweak this week?" })
      }),
      {
        params: {
          planId,
          threadId
        }
      }
    );

    expect(chatResponse.status).toBe(201);
    const chatBody = (await chatResponse.json()) as { assistantMessage: { content: string } };

    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue({
      id: sourceVersionId,
      trainingPlanId: "plan_1",
      planJson: { plan_name: "Initial", start_date: "2026-02-15", weeks: [] }
    } as never);
    vi.mocked(prisma.planTweakRequest.create).mockResolvedValue({
      id: "tweak_1"
    } as never);
    vi.mocked(prisma.sessionCompletion.findMany).mockResolvedValue([] as never);
    vi.mocked(generateTweakedPlan).mockResolvedValue({
      updatedPlanJson: { plan_name: "Adjusted", start_date: "2026-02-15", weeks: [] },
      changeSummary: "Reduced intensity and shifted hard session placement.",
      changed: true,
      retryCount: 0
    });
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: (client: any) => Promise<unknown>) =>
      callback({
        trainingPlanVersion: {
          findFirst: vi.fn().mockResolvedValue({ versionNumber: 3 }),
          create: vi.fn().mockResolvedValue({ id: nextVersionId })
        },
        trainingPlan: {
          update: vi.fn().mockResolvedValue({})
        },
        planChatThread: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "thread_new" })
        },
        planChatMessage: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn().mockResolvedValue({ count: 0 })
        },
        planTweakRequest: {
          update: vi.fn().mockResolvedValue({})
        }
      })
    );

    const tweakResponse = await POST_TWEAKS(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: sourceVersionId,
          scope: "whole_plan",
          requestText: chatBody.assistantMessage.content
        })
      }),
      {
        params: { planId }
      }
    );

    expect(tweakResponse.status).toBe(201);
    const tweakBody = (await tweakResponse.json()) as {
      tweakRequestId: string;
      resultPlanVersionId: string;
      changeSummary: string;
    };
    expect(tweakBody.tweakRequestId).toBe("tweak_1");
    expect(tweakBody.resultPlanVersionId).toBe(nextVersionId);
    expect(tweakBody.changeSummary).toContain("Reduced intensity");
    expect(carryForwardPlanVersionState).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sourcePlanVersionId: sourceVersionId,
        resultPlanVersionId: nextVersionId
      })
    );
  });
});
