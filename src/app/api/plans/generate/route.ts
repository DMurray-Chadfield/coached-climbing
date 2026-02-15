import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";
import { questionnaireSchema } from "@/lib/schemas/questionnaire";
import { generateTrainingPlan, PlanGenerationError } from "@/lib/services/plan-generator";

const generateRequestSchema = z.object({
  planId: z.string().cuid()
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => null);
    const parsedRequest = generateRequestSchema.safeParse(payload);

    if (!parsedRequest.success) {
      return jsonError(400, "INVALID_PAYLOAD", "planId is required.", parsedRequest.error.flatten());
    }

    const plan = await prisma.trainingPlan.findFirst({
      where: {
        id: parsedRequest.data.planId,
        userId
      },
      select: {
        id: true
      }
    });

    if (!plan) {
      return jsonError(404, "NOT_FOUND", "Plan not found.");
    }

    const latestQuestionnaire = await prisma.questionnaireResponse.findFirst({
      where: {
        userId,
        trainingPlanId: parsedRequest.data.planId
      } as never,
      orderBy: { createdAt: "desc" }
    });

    if (!latestQuestionnaire) {
      return jsonError(400, "QUESTIONNAIRE_REQUIRED", "Complete onboarding for this plan before generating.");
    }

    const questionnaire = questionnaireSchema.parse(latestQuestionnaire.data);
    const generated = await generateTrainingPlan(questionnaire);

    const planName =
      typeof generated.planJson.plan_name === "string" && generated.planJson.plan_name.length > 0
        ? generated.planJson.plan_name
        : "Generated Climbing Plan";

    const goal = questionnaire.target_focus.summary;

    const result = await prisma.$transaction(async (tx) => {
      const latestVersion = await tx.trainingPlanVersion.findFirst({
        where: { trainingPlanId: plan.id },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true }
      });

      const version = await tx.trainingPlanVersion.create({
        data: {
          trainingPlanId: plan.id,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          planJson: generated.planJson as Prisma.InputJsonValue
        },
        select: {
          id: true
        }
      });

      await tx.trainingPlan.update({
        where: { id: plan.id },
        data: {
          name: planName,
          goal,
          currentPlanVersionId: version.id
        }
      });

      return {
        planId: plan.id,
        planVersionId: version.id
      };
    });

    return NextResponse.json(
      {
        ...result,
        retryCount: generated.retryCount
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    if (error instanceof PlanGenerationError) {
      if (error.code === "VALIDATION_FAILED") {
        return jsonError(502, "PLAN_VALIDATION_FAILED", "Model output failed schema validation.", error.details);
      }

      if (error.code === "INVALID_RESPONSE") {
        return jsonError(502, "PLAN_INVALID_RESPONSE", "Model returned invalid JSON.");
      }

      console.error("Plan generation LLM failure", error.details);
      return jsonError(502, "PLAN_LLM_FAILURE", "Plan generation request failed.", error.details);
    }

    if (error instanceof z.ZodError) {
      return jsonError(
        400,
        "QUESTIONNAIRE_INVALID",
        "This plan has outdated onboarding data. Open onboarding for this plan and save it again.",
        error.flatten()
      );
    }

    console.error("Unexpected generate plan error", error);

    return jsonError(500, "INTERNAL_ERROR", "Unable to generate plan.");
  }
}
