import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-guard", () => ({
  requireUserId: vi.fn()
}));

vi.mock("@/lib/services/plan-tweak", () => {
  class MockPlanTweakError extends Error {
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
  }

  return {
    PlanTweakError: MockPlanTweakError,
    generateTweakedPlan: vi.fn()
  };
});

vi.mock("@/lib/prisma", () => {
  const tx = {
    trainingPlanVersion: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    trainingPlan: {
      update: vi.fn()
    },
    planTweakRequest: {
      update: vi.fn()
    }
  };

  return {
    prisma: {
      trainingPlan: {
        findFirst: vi.fn()
      },
      trainingPlanVersion: {
        findFirst: vi.fn()
      },
      planTweakRequest: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    }
  };
});

import { requireUserId } from "@/lib/server/auth-guard";
import { prisma } from "@/lib/prisma";
import { PlanTweakError, generateTweakedPlan } from "@/lib/services/plan-tweak";
import { GET, POST } from "@/app/api/plans/[planId]/tweaks/route";

describe("tweaks route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated access", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await POST(new Request("http://localhost"), {
      params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "week", requestText: "change this" })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 for missing or unauthorized source version", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue(null as never);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
          scope: "whole_plan",
          requestText: "reduce volume"
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(404);
  });

  it("creates a new plan version and tweak record on success", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue({
      id: "version_1",
      trainingPlanId: "plan_1",
      planJson: { weeks: [] }
    } as never);

    vi.mocked(prisma.planTweakRequest.create).mockResolvedValue({
      id: "tweak_1"
    } as never);

    const transactionMock = vi.mocked(prisma.$transaction);
    transactionMock.mockImplementationOnce(async (callback: (client: any) => Promise<unknown>) =>
      callback({
        trainingPlanVersion: {
          findFirst: vi.fn().mockResolvedValue({ versionNumber: 3 }),
          create: vi.fn().mockResolvedValue({ id: "version_4" })
        },
        trainingPlan: {
          update: vi.fn().mockResolvedValue({})
        },
        planTweakRequest: {
          update: vi.fn().mockResolvedValue({})
        }
      })
    );

    vi.mocked(generateTweakedPlan).mockResolvedValue({
      updatedPlanJson: { plan_name: "new", start_date: "2026-02-15", weeks: [] },
      changeSummary: "Reduced volume and moved load.",
      changed: true,
      retryCount: 0
    });

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
          scope: "whole_plan",
          requestText: "reduce volume"
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { tweakRequestId: string; resultPlanVersionId: string };
    expect(body.tweakRequestId).toBe("tweak_1");
    expect(body.resultPlanVersionId).toBe("version_4");
  });

  it("returns 502 and marks tweak as failed when model validation fails", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue({
      id: "version_1",
      trainingPlanId: "plan_1",
      planJson: { weeks: [] }
    } as never);
    vi.mocked(prisma.planTweakRequest.create).mockResolvedValue({ id: "tweak_1" } as never);

    vi.mocked(generateTweakedPlan).mockRejectedValue(
      new PlanTweakError("failed", "VALIDATION_FAILED", [{ field: "weeks" }])
    );

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
          scope: "whole_plan",
          requestText: "reduce volume"
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(502);
    expect(prisma.planTweakRequest.update).toHaveBeenCalled();
  });

  it("lists tweak history for an owned plan", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({ id: "plan_1" } as never);
    vi.mocked(prisma.planTweakRequest.findMany).mockResolvedValue([
      {
        id: "tweak_1",
        sourcePlanVersionId: "version_1",
        resultPlanVersionId: "version_2",
        scope: "whole_plan",
        targetWeekNumber: null,
        requestText: "Adjust load",
        llmSummaryText: "Done",
        status: "accepted",
        createdAt: new Date("2026-02-15T00:00:00.000Z"),
        updatedAt: new Date("2026-02-15T00:05:00.000Z")
      }
    ] as never);

    const response = await GET(new Request("http://localhost"), {
      params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    expect(response.status).toBe(200);
  });
});
