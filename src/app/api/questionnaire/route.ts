import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { questionnaireSchema } from "@/lib/schemas/questionnaire";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";

const postSchema = questionnaireSchema.extend({
  planId: z.string().cuid()
});

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(request.url);
    const planId = url.searchParams.get("planId");

    if (!planId) {
      return jsonError(400, "PLAN_ID_REQUIRED", "A planId query parameter is required.");
    }

    const plan = await prisma.trainingPlan.findFirst({
      where: {
        id: planId,
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

    const latest = await prisma.questionnaireResponse.findFirst({
      where: {
        userId,
        trainingPlanId: planId
      } as never,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ questionnaire: latest?.data ?? null });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to load questionnaire.");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => null);
    const parsed = postSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(400, "INVALID_PAYLOAD", "Invalid questionnaire payload", parsed.error.flatten());
    }

    const plan = await prisma.trainingPlan.findFirst({
      where: {
        id: parsed.data.planId,
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

    const { planId, ...questionnaireData } = parsed.data;

    const saved = await prisma.questionnaireResponse.create({
      data: {
        userId,
        trainingPlanId: planId,
        data: questionnaireData
      } as never,
      select: {
        id: true,
        createdAt: true
      }
    });

    return NextResponse.json({ id: saved.id, createdAt: saved.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to save questionnaire.");
  }
}
