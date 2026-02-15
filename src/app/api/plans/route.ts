import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";

export async function GET() {
  try {
    const userId = await requireUserId();

    const plans = await prisma.trainingPlan.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        goal: true,
        createdAt: true,
        updatedAt: true,
        currentPlanVersionId: true
      }
    });

    return NextResponse.json({
      plans: plans.map((plan) => ({
        ...plan,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
        completion_percent: 0
      }))
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to list plans.");
  }
}

export async function POST() {
  try {
    const userId = await requireUserId();

    const plan = await prisma.trainingPlan.create({
      data: {
        userId,
        name: "Untitled Plan"
      },
      select: {
        id: true
      }
    });

    return NextResponse.json({ planId: plan.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to create plan.");
  }
}
