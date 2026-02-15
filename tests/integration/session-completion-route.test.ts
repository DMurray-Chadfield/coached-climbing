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
  toggleSessionCompletion: vi.fn()
}));

import { requireUserId } from "@/lib/server/auth-guard";
import { prisma } from "@/lib/prisma";
import { toggleSessionCompletion } from "@/lib/services/plan-completion";
import { PATCH } from "@/app/api/plans/[planId]/sessions/completion/route";

describe("session completion route", () => {
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

  it("returns 404 for missing plan version", async () => {
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
          completed: true
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(404);
  });

  it("handles manual/derived completion toggles idempotently", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue({
      id: "version_1",
      trainingPlanId: "plan_1",
      planJson: {}
    } as never);

    vi.mocked(toggleSessionCompletion).mockResolvedValue({
      plan_completion_percent: 100,
      completed_sessions: 1,
      total_sessions: 1,
      completed_activities: 2,
      total_activities: 2,
      sessions: [
        {
          week_number: 1,
          session_number: 1,
          completed: true,
          completion_source: "derived_all_activities",
          completion_percent: 100
        }
      ],
      activities: []
    });

    const first = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
          weekNumber: 1,
          sessionNumber: 1,
          completed: false
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    const second = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
          weekNumber: 1,
          sessionNumber: 1,
          completed: false
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(toggleSessionCompletion).toHaveBeenCalledTimes(2);
  });
});
