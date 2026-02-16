import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-guard", () => ({
  requireUserId: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trainingPlan: {
      findFirst: vi.fn()
    },
    questionnaireResponse: {
      findFirst: vi.fn()
    },
    planGenerationJob: {
      findFirst: vi.fn(),
      create: vi.fn()
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
import { POST } from "@/app/api/plans/generate/route";

describe("plans generate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await POST(
      new Request("http://localhost/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "ckzv3m9ub0000n8p7h9grq2la" })
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");

    const response = await POST(
      new Request("http://localhost/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 when plan is missing", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue(null as never);

    const response = await POST(
      new Request("http://localhost/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "ckzv3m9ub0000n8p7h9grq2la" })
      })
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 when questionnaire is missing", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({ id: "plan_1" } as never);
    vi.mocked(prisma.questionnaireResponse.findFirst).mockResolvedValue(null as never);

    const response = await POST(
      new Request("http://localhost/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "ckzv3m9ub0000n8p7h9grq2la" })
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("QUESTIONNAIRE_REQUIRED");
  });

  it("returns existing active job after unique collision", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({ id: "plan_1" } as never);
    vi.mocked(prisma.questionnaireResponse.findFirst).mockResolvedValue({ id: "q_1" } as never);

    vi.mocked(prisma.planGenerationJob.findFirst)
      // idempotency lookup
      .mockResolvedValueOnce(null as never)
      // active lookup before create
      .mockResolvedValueOnce(null as never)
      // active lookup after P2002 collision
      .mockResolvedValueOnce({
        id: "job_1",
        userId: "user_1",
        trainingPlanId: "ckzv3m9ub0000n8p7h9grq2la",
        status: "running",
        retryCount: null,
        resultPlanVersionId: null,
        errorCode: null,
        errorMessage: null,
        errorDetails: null,
        createdAt: new Date("2026-02-16T00:00:00.000Z"),
        startedAt: new Date("2026-02-16T00:00:05.000Z"),
        finishedAt: null
      } as never);

    vi.mocked(prisma.planGenerationJob.create).mockRejectedValue({ code: "P2002" } as never);

    const response = await POST(
      new Request("http://localhost/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "key-1" },
        body: JSON.stringify({ planId: "ckzv3m9ub0000n8p7h9grq2la" })
      })
    );

    expect(response.status).toBe(202);
    const body = (await response.json()) as { jobId: string; status: string };
    expect(body.jobId).toBe("job_1");
    expect(body.status).toBe("running");
    expect(processPlanGenerationJob).not.toHaveBeenCalled();
  });

  it("returns the same job for the same Idempotency-Key", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({ id: "plan_1" } as never);
    vi.mocked(prisma.questionnaireResponse.findFirst).mockResolvedValue({ id: "q_1" } as never);
    vi.mocked(prisma.planGenerationJob.findFirst).mockResolvedValue({
      id: "job_same",
      userId: "user_1",
      trainingPlanId: "ckzv3m9ub0000n8p7h9grq2la",
      status: "succeeded",
      retryCount: 0,
      resultPlanVersionId: "v_1",
      errorCode: null,
      errorMessage: null,
      errorDetails: null,
      createdAt: new Date("2026-02-16T00:00:00.000Z"),
      startedAt: new Date("2026-02-16T00:00:01.000Z"),
      finishedAt: new Date("2026-02-16T00:00:02.000Z")
    } as never);

    const response = await POST(
      new Request("http://localhost/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "key-same" },
        body: JSON.stringify({ planId: "ckzv3m9ub0000n8p7h9grq2la" })
      })
    );

    expect(response.status).toBe(202);
    const body = (await response.json()) as { jobId: string; planVersionId?: string };
    expect(body.jobId).toBe("job_same");
    expect(body.planVersionId).toBe("v_1");
    expect(processPlanGenerationJob).not.toHaveBeenCalled();
  });

  it("starts background processing when job is queued", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({ id: "plan_1" } as never);
    vi.mocked(prisma.questionnaireResponse.findFirst).mockResolvedValue({ id: "q_1" } as never);

    vi.mocked(prisma.planGenerationJob.findFirst)
      // idempotency lookup
      .mockResolvedValueOnce(null as never)
      // active lookup
      .mockResolvedValueOnce(null as never);

    vi.mocked(prisma.planGenerationJob.create).mockResolvedValue({
      id: "job_new",
      userId: "user_1",
      trainingPlanId: "ckzv3m9ub0000n8p7h9grq2la",
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

    const response = await POST(
      new Request("http://localhost/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "key-new" },
        body: JSON.stringify({ planId: "ckzv3m9ub0000n8p7h9grq2la" })
      })
    );

    expect(response.status).toBe(202);
    expect(processPlanGenerationJob).toHaveBeenCalledWith("job_new");
  });
});

