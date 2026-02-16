import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";
import {
  createOrReusePlanGenerationJob,
  PlanGenerationJobError,
  processPlanGenerationJob
} from "@/lib/services/plan-generation-jobs";

const generateRequestSchema = z.object({
  planId: z.string().cuid()
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => null);
    const parsedRequest = generateRequestSchema.safeParse(payload);
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() || null;

    if (idempotencyKey && idempotencyKey.length > 128) {
      return jsonError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency key is too long.");
    }

    if (!parsedRequest.success) {
      return jsonError(400, "INVALID_PAYLOAD", "planId is required.", parsedRequest.error.flatten());
    }

    const job = await createOrReusePlanGenerationJob({
      userId,
      planId: parsedRequest.data.planId,
      idempotencyKey
    });

    if (job.status === "queued") {
      void processPlanGenerationJob(job.id);
    }

    return NextResponse.json(
      {
        jobId: job.id,
        planId: job.trainingPlanId,
        status: job.status,
        ...(job.resultPlanVersionId ? { planVersionId: job.resultPlanVersionId } : {})
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    if (error instanceof PlanGenerationJobError) {
      if (error.code === "PLAN_NOT_FOUND") {
        return jsonError(404, "NOT_FOUND", "Plan not found.");
      }

      if (error.code === "QUESTIONNAIRE_REQUIRED") {
        return jsonError(400, "QUESTIONNAIRE_REQUIRED", "Complete onboarding for this plan before writing.");
      }

      if (error.code === "INVALID_IDEMPOTENCY_KEY") {
        return jsonError(400, "INVALID_IDEMPOTENCY_KEY", error.message, error.details);
      }
    }

    console.error("Unexpected generate plan error", error);

    return jsonError(500, "INTERNAL_ERROR", "Unable to write plan.");
  }
}
