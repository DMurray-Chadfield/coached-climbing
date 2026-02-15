import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";
import { toggleSessionCompletion } from "@/lib/services/plan-completion";

const patchSchema = z.object({
  planVersionId: z.string().cuid(),
  weekNumber: z.number().int().positive(),
  sessionNumber: z.number().int().positive(),
  completed: z.boolean()
});

export async function PATCH(
  request: Request,
  context: {
    params: { planId: string };
  }
) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(400, "INVALID_PAYLOAD", "Invalid session completion payload.", parsed.error.flatten());
    }

    const version = await prisma.trainingPlanVersion.findFirst({
      where: {
        id: parsed.data.planVersionId,
        trainingPlanId: context.params.planId,
        trainingPlan: {
          userId
        }
      },
      select: {
        id: true,
        trainingPlanId: true,
        planJson: true
      }
    });

    if (!version) {
      return jsonError(404, "NOT_FOUND", "Plan version not found.");
    }

    const completion = await toggleSessionCompletion({
      userId,
      trainingPlanId: version.trainingPlanId,
      planVersionId: version.id,
      weekNumber: parsed.data.weekNumber,
      sessionNumber: parsed.data.sessionNumber,
      completed: parsed.data.completed,
      planJson: version.planJson
    });

    return NextResponse.json({ completion });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    if (error instanceof Error && ["INVALID_PLAN_JSON", "INVALID_SESSION"].includes(error.message)) {
      return jsonError(400, "INVALID_PLAN_REFERENCE", "Invalid week/session reference for this plan version.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to update session completion.");
  }
}
