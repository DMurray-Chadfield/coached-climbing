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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingPlan: {
      findFirst: vi.fn()
    },
    questionnaireResponse: {
      findFirst: vi.fn()
    },
    trainingPlanVersion: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    planChatThread: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    planChatMessage: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    planTweakRequest: {
      findFirst: vi.fn()
    },
    $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) =>
      callback({
        planChatMessage: {
          create: vi
            .fn()
            .mockResolvedValueOnce({
              id: "msg_user",
              role: "user",
              content: "User message",
              sourceTweakRequestId: null,
              createdAt: new Date("2026-02-15T00:00:00.000Z")
            })
            .mockResolvedValueOnce({
              id: "msg_assistant",
              role: "assistant",
              content: "Assistant response",
              sourceTweakRequestId: null,
              createdAt: new Date("2026-02-15T00:00:02.000Z")
            })
        },
        planChatThread: {
          update: vi.fn().mockResolvedValue({})
        }
      })
    )
  }
}));

import { requireUserId } from "@/lib/server/auth-guard";
import { prisma } from "@/lib/prisma";
import { generatePlanChatReply } from "@/lib/services/plan-chat";
import { getCompletionSnapshot } from "@/lib/services/plan-completion";
import { getNotesSnapshot } from "@/lib/services/plan-notes";
import { GET as GET_THREADS, POST as POST_THREADS } from "@/app/api/plans/[planId]/chat/threads/route";
import {
  GET as GET_MESSAGES,
  POST as POST_MESSAGES
} from "@/app/api/plans/[planId]/chat/threads/[threadId]/messages/route";

describe("chat routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated thread create", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await POST_THREADS(new Request("http://localhost"), {
      params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when creating thread with unauthorized version", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({
      id: "plan_1",
      currentPlanVersionId: "version_1"
    } as never);
    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue(null as never);

    const response = await POST_THREADS(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
          title: "Thread"
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(404);
  });

  it("lists threads for owned plan", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({ id: "plan_1" } as never);
    vi.mocked(prisma.planChatThread.findMany).mockResolvedValue([
      {
        id: "thread_1",
        planVersionId: "version_1",
        title: "Chat",
        createdAt: new Date("2026-02-15T00:00:00.000Z"),
        updatedAt: new Date("2026-02-15T00:01:00.000Z")
      }
    ] as never);

    const response = await GET_THREADS(new Request("http://localhost"), {
      params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    expect(response.status).toBe(200);
  });

  it("reuses existing default thread for current plan version", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({
      id: "plan_1",
      currentPlanVersionId: "version_1"
    } as never);
    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue({
      id: "version_1",
      trainingPlanId: "plan_1"
    } as never);
    vi.mocked(prisma.planChatThread.findFirst).mockResolvedValue({
      id: "thread_1",
      planVersionId: "version_1",
      title: "Plan chat",
      createdAt: new Date("2026-02-15T00:00:00.000Z"),
      updatedAt: new Date("2026-02-15T00:00:00.000Z")
    } as never);

    const response = await POST_THREADS(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(200);
    expect(prisma.planChatThread.create).not.toHaveBeenCalled();
  });

  it("returns 404 for message post to non-owned thread", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.planChatThread.findFirst).mockResolvedValue(null as never);

    const response = await POST_MESSAGES(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Help me adjust week 1" })
      }),
      {
        params: {
          planId: "ckzv3m9ub0000n8p7h9grq2la",
          threadId: "ckzv3m9ub0001n8p7h9grq2lb"
        }
      }
    );

    expect(response.status).toBe(404);
  });

  it("creates user+assistant messages and does not mutate plan JSON", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.planChatThread.findFirst).mockResolvedValue({
      id: "thread_1",
      trainingPlanId: "plan_1",
      planVersionId: "version_1",
      planVersion: {
        planJson: {
          plan_name: "Test",
          start_date: "2026-02-15",
          weeks: []
        }
      }
    } as never);
    vi.mocked(prisma.planChatMessage.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.questionnaireResponse.findFirst).mockResolvedValue({
      data: { sessions_per_week: 3 }
    } as never);
    vi.mocked(getCompletionSnapshot).mockResolvedValue({
      plan_completion_percent: 25,
      completed_sessions: 1,
      total_sessions: 4,
      completed_activities: 2,
      total_activities: 8,
      sessions: [],
      activities: []
    });
    vi.mocked(getNotesSnapshot).mockResolvedValue({
      sessions: [],
      activities: []
    });
    vi.mocked(generatePlanChatReply).mockResolvedValue("Assistant response");

    const response = await POST_MESSAGES(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "How hard should week 2 be?" })
      }),
      {
        params: {
          planId: "ckzv3m9ub0000n8p7h9grq2la",
          threadId: "ckzv3m9ub0001n8p7h9grq2lb"
        }
      }
    );

    expect(response.status).toBe(201);
    expect(prisma.trainingPlanVersion.update).not.toHaveBeenCalled();
    expect(getCompletionSnapshot).toHaveBeenCalledTimes(1);
    expect(getNotesSnapshot).toHaveBeenCalledTimes(1);
    expect(generatePlanChatReply).toHaveBeenCalledWith(
      expect.objectContaining({
        onboarding: { sessions_per_week: 3 }
      })
    );
  });

  it("lists messages for owned thread", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.planChatThread.findFirst).mockResolvedValue({ id: "thread_1" } as never);
    vi.mocked(prisma.planChatMessage.findMany).mockResolvedValue([
      {
        id: "msg_1",
        role: "user",
        content: "Question",
        sourceTweakRequestId: null,
        createdAt: new Date("2026-02-15T00:00:00.000Z")
      }
    ] as never);

    const response = await GET_MESSAGES(new Request("http://localhost"), {
      params: {
        planId: "ckzv3m9ub0000n8p7h9grq2la",
        threadId: "ckzv3m9ub0001n8p7h9grq2lb"
      }
    });

    expect(response.status).toBe(200);
  });

  it("creates distinct default threads for different plan versions and remains idempotent per version", async () => {
    const version1Id = "ckzv3m9ub0000n8p7h9grq2la";
    const version2Id = "ckzv3m9ub0001n8p7h9grq2lb";

    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({
      id: "plan_1",
      currentPlanVersionId: version1Id
    } as never);
    vi.mocked(prisma.trainingPlanVersion.findFirst)
      .mockResolvedValueOnce({ id: version1Id, trainingPlanId: "plan_1" } as never)
      .mockResolvedValueOnce({ id: version2Id, trainingPlanId: "plan_1" } as never)
      .mockResolvedValueOnce({ id: version2Id, trainingPlanId: "plan_1" } as never);
    vi.mocked(prisma.planChatThread.findFirst)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        id: "thread_v2",
        planVersionId: version2Id,
        title: "Plan chat",
        createdAt: new Date("2026-02-15T00:05:00.000Z"),
        updatedAt: new Date("2026-02-15T00:05:00.000Z")
      } as never);
    vi.mocked(prisma.planChatThread.create)
      .mockResolvedValueOnce({
        id: "thread_v1",
        planVersionId: version1Id,
        title: "Plan chat",
        createdAt: new Date("2026-02-15T00:00:00.000Z"),
        updatedAt: new Date("2026-02-15T00:00:00.000Z")
      } as never)
      .mockResolvedValueOnce({
        id: "thread_v2",
        planVersionId: version2Id,
        title: "Plan chat",
        createdAt: new Date("2026-02-15T00:05:00.000Z"),
        updatedAt: new Date("2026-02-15T00:05:00.000Z")
      } as never);

    const v1Response = await POST_THREADS(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planVersionId: version1Id })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );
    expect(v1Response.status).toBe(201);

    const v2Response = await POST_THREADS(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planVersionId: version2Id })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );
    expect(v2Response.status).toBe(201);

    const v2RepeatResponse = await POST_THREADS(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planVersionId: version2Id })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );
    expect(v2RepeatResponse.status).toBe(200);
    expect(prisma.planChatThread.create).toHaveBeenCalledTimes(2);
  });
});
