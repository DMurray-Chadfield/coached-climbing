import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";
import { questionnaireSchema } from "@/lib/schemas/questionnaire";
import { generateTrainingPlan, PlanGenerationError } from "@/lib/services/plan-generator";

export async function POST() {
  try {
    const userId = await requireUserId();

    const latestQuestionnaire = await prisma.questionnaireResponse.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    if (!latestQuestionnaire) {
      return jsonError(400, "QUESTIONNAIRE_REQUIRED", "Complete onboarding before generating a plan.");
    }

    const questionnaire = questionnaireSchema.parse(latestQuestionnaire.data);
    const generated = await generateTrainingPlan(questionnaire);

    const planName =
      typeof generated.planJson.plan_name === "string" && generated.planJson.plan_name.length > 0
        ? generated.planJson.plan_name
        : "Generated Climbing Plan";

    const goal = questionnaire.goals.join(", ");

    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.trainingPlan.create({
        data: {
          userId,
          name: planName,
          goal
        },
        select: {
          id: true
        }
      });

      const version = await tx.trainingPlanVersion.create({
        data: {
          trainingPlanId: plan.id,
          versionNumber: 1,
          planJson: generated.planJson as Prisma.InputJsonValue
        },
        select: {
          id: true
        }
      });

      await tx.trainingPlan.update({
        where: { id: plan.id },
        data: {
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

      return jsonError(502, "PLAN_LLM_FAILURE", "Plan generation request failed.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to generate plan.");
  }
}
