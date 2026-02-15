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

vi.mock("@/lib/services/plan-notes", () => ({
  setSessionNote: vi.fn()
}));

import { requireUserId } from "@/lib/server/auth-guard";
import { prisma } from "@/lib/prisma";
import { setSessionNote } from "@/lib/services/plan-notes";
import { PATCH } from "@/app/api/plans/[planId]/sessions/notes/route";

describe("session notes route", () => {
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

  it("returns 404 for non-owned plan version", async () => {
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
          noteText: "Felt strong"
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(404);
  });

  it("saves a valid session note", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlanVersion.findFirst).mockResolvedValue({
      id: "version_1",
      trainingPlanId: "plan_1",
      planJson: {}
    } as never);
    vi.mocked(setSessionNote).mockResolvedValue({ sessions: [], activities: [] });

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planVersionId: "ckzv3m9ub0000n8p7h9grq2la",
          weekNumber: 1,
          sessionNumber: 1,
          noteText: "Felt strong"
        })
      }),
      {
        params: { planId: "ckzv3m9ub0000n8p7h9grq2la" }
      }
    );

    expect(response.status).toBe(200);
    expect(setSessionNote).toHaveBeenCalledTimes(1);
  });
});
