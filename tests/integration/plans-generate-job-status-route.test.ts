import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-guard", () => ({
  requireUserId: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    planGenerationJob: {
      findFirst: vi.fn()
    }
  }
}));

vi.mock("@/lib/services/plan-generation-jobs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/plan-generation-jobs")>(
    "@/lib/services/plan-generation-jobs"
  );

  return {
    ...actual,
    processPlanGenerationJob: vi.fn()
  };
});

import { requireUserId } from "@/lib/server/auth-guard";
import { prisma } from "@/lib/prisma";
import { processPlanGenerationJob } from "@/lib/services/plan-generation-jobs";
import { GET } from "@/app/api/plans/generate/jobs/[jobId]/route";

describe("plan generation job status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await GET(new Request("http://localhost"), {
      params: { jobId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 for missing job", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.planGenerationJob.findFirst).mockResolvedValue(null as never);

    const response = await GET(new Request("http://localhost"), {
      params: { jobId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    expect(response.status).toBe(404);
  });

  it("includes planVersionId for succeeded job", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.planGenerationJob.findFirst).mockResolvedValue({
      id: "job_1",
      trainingPlanId: "plan_1",
      status: "succeeded",
      retryCount: 1,
      resultPlanVersionId: "v_1",
      errorCode: null,
      errorMessage: null,
      errorDetails: null,
      createdAt: new Date("2026-02-16T00:00:00.000Z"),
      startedAt: new Date("2026-02-16T00:00:01.000Z"),
      finishedAt: new Date("2026-02-16T00:00:02.000Z")
    } as never);

    const response = await GET(new Request("http://localhost"), {
      params: { jobId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { planVersionId: string | null; status: string };
    expect(body.status).toBe("succeeded");
    expect(body.planVersionId).toBe("v_1");
  });

  it("kicks processing when status is queued", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.planGenerationJob.findFirst).mockResolvedValue({
      id: "job_queued",
      trainingPlanId: "plan_1",
      status: "queued",
      retryCount: null,
      resultPlanVersionId: null,
      errorCode: null,
      errorMessage: null,
      errorDetails: null,
      createdAt: new Date("2026-02-16T00:00:00.000Z"),
      startedAt: null,
      finishedAt: null
    } as never);

    const response = await GET(new Request("http://localhost"), {
      params: { jobId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    expect(response.status).toBe(200);
    expect(processPlanGenerationJob).toHaveBeenCalledWith("job_queued");
  });

  it("returns sanitized error payload for failed jobs", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.planGenerationJob.findFirst).mockResolvedValue({
      id: "job_failed",
      trainingPlanId: "plan_1",
      status: "failed",
      retryCount: null,
      resultPlanVersionId: null,
      errorCode: "PLAN_LLM_FAILURE",
      createdAt: new Date("2026-02-16T00:00:00.000Z"),
      startedAt: new Date("2026-02-16T00:00:01.000Z"),
      finishedAt: new Date("2026-02-16T00:02:00.000Z")
    } as never);

    const response = await GET(new Request("http://localhost"), {
      params: { jobId: "ckzv3m9ub0000n8p7h9grq2la" }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      error: {
        code: string;
        message: string;
        details?: unknown;
      } | null;
    };

    expect(body.error).toEqual({
      code: "PLAN_GENERATION_FAILED",
      message: "Plan generation failed. Please try again."
    });
    expect(body.error && "details" in body.error).toBe(false);
  });
});
