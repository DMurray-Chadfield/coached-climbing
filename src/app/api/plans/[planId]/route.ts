import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";
import { getCompletionSnapshot } from "@/lib/services/plan-completion";
import { getNotesSnapshot } from "@/lib/services/plan-notes";

export async function GET(
  _request: Request,
  context: {
    params: { planId: string };
  }
) {
  try {
    const userId = await requireUserId();

    const plan = await prisma.trainingPlan.findFirst({
      where: {
        id: context.params.planId,
        userId,
        deletedAt: null
      },
      include: {
        currentPlanVersion: {
          select: {
            id: true,
            versionNumber: true,
            planJson: true,
            createdAt: true
          }
        }
      }
    });

    if (!plan || !plan.currentPlanVersion) {
      return jsonError(404, "NOT_FOUND", "Plan not found.");
    }

    const completion = await getCompletionSnapshot({
      userId,
      trainingPlanId: plan.id,
      planVersionId: plan.currentPlanVersion.id,
      planJson: plan.currentPlanVersion.planJson
    });
    const notes = await getNotesSnapshot({
      userId,
      trainingPlanId: plan.id,
      planVersionId: plan.currentPlanVersion.id
    });

    return NextResponse.json({
      id: plan.id,
      name: plan.name,
      goal: plan.goal,
      current_plan_version_id: plan.currentPlanVersionId,
      current_plan_version: {
        ...plan.currentPlanVersion,
        createdAt: plan.currentPlanVersion.createdAt.toISOString()
      },
      completion,
      notes,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to load plan.");
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: { planId: string };
  }
) {
  try {
    const userId = await requireUserId();

    const plan = await prisma.trainingPlan.findFirst({
      where: {
        id: context.params.planId,
        userId,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    if (!plan) {
      return jsonError(404, "NOT_FOUND", "Plan not found.");
    }

    await prisma.trainingPlan.update({
      where: {
        id: plan.id
      },
      data: {
        deletedAt: new Date(),
        currentPlanVersionId: null
      }
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to delete plan.");
  }
}
