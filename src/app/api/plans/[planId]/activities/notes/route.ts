import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";
import { setActivityNote } from "@/lib/services/plan-notes";

const patchSchema = z.object({
  planVersionId: z.string().cuid(),
  weekNumber: z.number().int().positive(),
  sessionNumber: z.number().int().positive(),
  activityId: z.string().min(1),
  noteText: z.string().max(4000)
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
      return jsonError(400, "INVALID_PAYLOAD", "Invalid activity note payload.", parsed.error.flatten());
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

    const notes = await setActivityNote({
      userId,
      trainingPlanId: version.trainingPlanId,
      planVersionId: version.id,
      weekNumber: parsed.data.weekNumber,
      sessionNumber: parsed.data.sessionNumber,
      activityId: parsed.data.activityId,
      noteText: parsed.data.noteText,
      planJson: version.planJson
    });

    return NextResponse.json({ notes });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    if (error instanceof Error && ["INVALID_SESSION", "INVALID_ACTIVITY"].includes(error.message)) {
      return jsonError(400, "INVALID_PLAN_REFERENCE", "Invalid week/session/activity reference for this plan version.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to update activity note.");
  }
}
