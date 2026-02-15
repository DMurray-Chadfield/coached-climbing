import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-guard", () => ({
  requireUserId: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingPlanVersion: {
      findFirst: vi.fn()
    }
  }
}));

vi.mock("@/lib/services/plan-completion", () => ({
  toggleActivityCompletion: vi.fn()
}));

import { requireUserId } from "@/lib/server/auth-guard";
import { prisma } from "@/lib/prisma";
import { toggleActivityCompletion } from "@/lib/services/plan-completion";
import { PATCH } from "@/app/api/plans/[planId]/activities/completion/route";

describe("activity completion route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await PATCH(new Request("http://localhost"), {
      params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 for missing or unauthorized plan version", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue(null as never);

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
          weekNumber: 1,
          sessionNumber: 1,
          activityId: "w1s1a1",
          completed: true
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(404);
  });

  it("toggles completion and remains idempotent", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue({
      id: "version_1",
      trainingPlanId: "plan_1",
      planJson: {}
    } as never);

    vi.mocked(toggleActivityCompletion).mockResolvedValue({
      plan_completion_percent: 50,
      completed_sessions: 0,
      total_sessions: 1,
      completed_activities: 1,
      total_activities: 2,
      sessions: [],
      activities: []
    });

    const request = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
        weekNumber: 1,
        sessionNumber: 1,
        activityId: "w1s1a1",
        completed: true
      })
    });

    const first = await PATCH(request, {
      params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    const second = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
          weekNumber: 1,
          sessionNumber: 1,
          activityId: "w1s1a1",
          completed: true
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(toggleActivityCompletion).toHaveBeenCalledTimes(2);
  });

  it("returns 400 for invalid activity references", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue({
      id: "version_1",
      trainingPlanId: "plan_1",
      planJson: {}
    } as never);
    vi.mocked(toggleActivityCompletion).mockRejectedValue(new Error("INVALID_ACTIVITY"));

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
          weekNumber: 1,
          sessionNumber: 1,
          activityId: "missing",
          completed: true
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(400);
  });
});
