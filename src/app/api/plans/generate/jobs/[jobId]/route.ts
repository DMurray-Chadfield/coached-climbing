import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";
import { processPlanGenerationJob } from "@/lib/services/plan-generation-jobs";

const paramsSchema = z.object({
  jobId: z.string().cuid()
});

export async function GET(
  _request: Request,
  context: {
    params: { jobId: string };
  }
) {
  try {
    const userId = await requireUserId();
    const parsedParams = paramsSchema.safeParse(context.params);

    if (!parsedParams.success) {
      return jsonError(400, "INVALID_PARAMS", "jobId is required.", parsedParams.error.flatten());
    }

    const job = await prisma.planGenerationJob.findFirst({
      where: {
        id: parsedParams.data.jobId,
        userId
      },
      select: {
        id: true,
        trainingPlanId: true,
        status: true,
        retryCount: true,
        resultPlanVersionId: true,
        errorCode: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true
      }
    });

    if (!job) {
      return jsonError(404, "NOT_FOUND", "Job not found.");
    }

    if (job.status === "queued") {
      void processPlanGenerationJob(job.id);
    }

    return NextResponse.json({
      jobId: job.id,
      planId: job.trainingPlanId,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      finishedAt: job.finishedAt?.toISOString() ?? null,
      retryCount: job.retryCount ?? null,
      planVersionId: job.resultPlanVersionId ?? null,
      error:
        job.status === "failed"
          ? {
              code: "PLAN_GENERATION_FAILED",
              message: "Plan generation failed. Please try again."
            }
          : null
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    console.error("Unexpected plan generation job status error", error);
    return jsonError(500, "INTERNAL_ERROR", "Unable to load generation status.");
  }
}
