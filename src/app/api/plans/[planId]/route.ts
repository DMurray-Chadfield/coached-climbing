import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";

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
        userId
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

    return NextResponse.json({
      id: plan.id,
      name: plan.name,
      goal: plan.goal,
      current_plan_version_id: plan.currentPlanVersionId,
      current_plan_version: {
        ...plan.currentPlanVersion,
        createdAt: plan.currentPlanVersion.createdAt.toISOString()
      },
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
