import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";

const postSchema = z.object({
  planVersionId: z.string().cuid().optional(),
  title: z.string().min(1).max(120).optional()
});

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
      select: {
        id: true
      }
    });

    if (!plan) {
      return jsonError(404, "NOT_FOUND", "Plan not found.");
    }

    const threads = await prisma.planChatThread.findMany({
      where: {
        trainingPlanId: plan.id,
        userId
      },
      orderBy: {
        updatedAt: "desc"
      },
      select: {
        id: true,
        planVersionId: true,
        title: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      threads: threads.map((thread) => ({
        ...thread,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to list chat threads.");
  }
}

export async function POST(
  request: Request,
  context: {
    params: { planId: string };
  }
) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => null);
    const parsed = postSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(400, "INVALID_PAYLOAD", "Invalid chat thread payload.", parsed.error.flatten());
    }

    const planWithVersion = await prisma.trainingPlan.findFirst({
      where: {
        id: context.params.planId,
        userId
      },
      select: {
        id: true,
        currentPlanVersionId: true
      }
    });

    if (!planWithVersion) {
      return jsonError(404, "NOT_FOUND", "Plan not found.");
    }

    const targetVersionId = parsed.data.planVersionId ?? planWithVersion.currentPlanVersionId;

    if (!targetVersionId) {
      return jsonError(400, "PLAN_VERSION_REQUIRED", "No generated plan version is available for chat.");
    }

    const version = await prisma.trainingPlanVersion.findFirst({
      where: {
        id: targetVersionId,
        trainingPlanId: context.params.planId,
        trainingPlan: {
          userId
        }
      },
      select: {
        id: true,
        trainingPlanId: true
      }
    });

    if (!version) {
      return jsonError(404, "NOT_FOUND", "Plan version not found.");
    }

    const existing = await prisma.planChatThread.findFirst({
      where: {
        userId,
        trainingPlanId: version.trainingPlanId,
        planVersionId: version.id
      },
      select: {
        id: true,
        planVersionId: true,
        title: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (existing) {
      return NextResponse.json({
        thread: {
          ...existing,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString()
        }
      });
    }

    const thread = await prisma.planChatThread.create({
      data: {
        userId,
        trainingPlanId: version.trainingPlanId,
        planVersionId: version.id,
        title: parsed.data.title ?? "Plan chat"
      },
      select: {
        id: true,
        planVersionId: true,
        title: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(
      {
        thread: {
          ...thread,
          createdAt: thread.createdAt.toISOString(),
          updatedAt: thread.updatedAt.toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to create chat thread.");
  }
}
