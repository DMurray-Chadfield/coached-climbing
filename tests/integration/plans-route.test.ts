import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-guard", () => ({
  requireUserId: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingPlan: {
      findMany: vi.fn()
    }
  }
}));

import { requireUserId } from "@/lib/server/auth-guard";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/plans/route";

describe("plans route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated access", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("lists plans sorted payload", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([
      {
        id: "plan_1",
        name: "Plan 1",
        goal: "Goal",
        createdAt: new Date("2026-02-15T00:00:00.000Z"),
        updatedAt: new Date("2026-02-16T00:00:00.000Z"),
        currentPlanVersionId: "v1"
      }
    ] as never);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { plans: Array<{ completion_percent: number }> };
    expect(body.plans[0]?.completion_percent).toBe(0);
  });
});
