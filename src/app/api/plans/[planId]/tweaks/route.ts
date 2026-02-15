import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";
import { PlanTweakError, generateTweakedPlan } from "@/lib/services/plan-tweak";
import { normalizePlanDiscipline } from "@/lib/services/training-context";

const postSchema = z
  .object({
    planVersionId: z.string().cuid(),
    scope: z.enum(["week", "whole_plan"]),
    targetWeekNumber: z.number().int().positive().optional(),
    requestText: z.string().min(1)
  })
  .superRefine((value, ctx) => {
    if (value.scope === "week" && typeof value.targetWeekNumber !== "number") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetWeekNumber is required when scope is week.",
        path: ["targetWeekNumber"]
      });
    }

    if (value.scope === "whole_plan" && typeof value.targetWeekNumber !== "undefined") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetWeekNumber is only allowed when scope is week.",
        path: ["targetWeekNumber"]
      });
    }
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

    const tweaks = await prisma.planTweakRequest.findMany({
      where: {
        trainingPlanId: plan.id,
        userId
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        sourcePlanVersionId: true,
        resultPlanVersionId: true,
        scope: true,
        targetWeekNumber: true,
        requestText: true,
        llmSummaryText: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      tweaks: tweaks.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to list tweak requests.");
  }
}

export async function POST(
  request: Request,
  context: {
    params: { planId: string };
  }
) {
  let tweakRequestId: string | null = null;

  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => null);
    const parsed = postSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(400, "INVALID_PAYLOAD", "Invalid tweak request payload.", parsed.error.flatten());
    }

    const sourceVersion = await prisma.trainingPlanVersion.findFirst({
      where: {
        id: parsed.data.planVersionId,
        trainingPlanId: context.params.planId,
        trainingPlan: {
          userId,
          deletedAt: null
        }
      },
      select: {
        id: true,
        trainingPlanId: true,
        planJson: true
      }
    });

    if (!sourceVersion) {
      return jsonError(404, "NOT_FOUND", "Plan version not found.");
    }

    const tweak = await prisma.planTweakRequest.create({
      data: {
        userId,
        trainingPlanId: sourceVersion.trainingPlanId,
        sourcePlanVersionId: sourceVersion.id,
        scope: parsed.data.scope,
        targetWeekNumber: parsed.data.targetWeekNumber,
        requestText: parsed.data.requestText,
        status: "pending"
      },
      select: {
        id: true
      }
    });

    tweakRequestId = tweak.id;

    const lockedCompletedSessions = await prisma.sessionCompletion.findMany({
      where: {
        userId,
        trainingPlanId: sourceVersion.trainingPlanId,
        planVersionId: sourceVersion.id,
        completedAt: {
          not: null
        }
      },
      select: {
        weekNumber: true,
        sessionNumber: true
      }
    });

    const latestQuestionnaire = await prisma.questionnaireResponse.findFirst({
      where: {
        userId,
        trainingPlanId: sourceVersion.trainingPlanId
      } as never,
      orderBy: {
        createdAt: "desc"
      },
      select: {
        data: true
      }
    });
    const planDiscipline = normalizePlanDiscipline(
      (latestQuestionnaire?.data as Record<string, unknown> | null)?.plan_discipline
    );

    const generated = await generateTweakedPlan({
      planJson: sourceVersion.planJson as Record<string, unknown>,
      requestText: parsed.data.requestText,
      scope: parsed.data.scope,
      targetWeekNumber: parsed.data.targetWeekNumber,
      planDiscipline: planDiscipline ?? undefined,
      lockedCompletedSessions
    });

    const result = await prisma.$transaction(async (tx) => {
      const latestVersion = await tx.trainingPlanVersion.findFirst({
        where: {
          trainingPlanId: sourceVersion.trainingPlanId
        },
        orderBy: {
          versionNumber: "desc"
        },
        select: {
          versionNumber: true
        }
      });

      const createdVersion = await tx.trainingPlanVersion.create({
        data: {
          trainingPlanId: sourceVersion.trainingPlanId,
          versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
          planJson: generated.updatedPlanJson as Prisma.InputJsonValue
        },
        select: {
          id: true
        }
      });

      await tx.trainingPlan.update({
        where: {
          id: sourceVersion.trainingPlanId
        },
        data: {
          currentPlanVersionId: createdVersion.id
        }
      });

      const sourceThread = await tx.planChatThread.findFirst({
        where: {
          userId,
          trainingPlanId: sourceVersion.trainingPlanId,
          planVersionId: sourceVersion.id
        },
        orderBy: {
          updatedAt: "desc"
        },
        select: {
          id: true,
          title: true
        }
      });

      const existingTargetThread = await tx.planChatThread.findFirst({
        where: {
          userId,
          trainingPlanId: sourceVersion.trainingPlanId,
          planVersionId: createdVersion.id
        },
        select: {
          id: true
        }
      });

      if (sourceThread && !existingTargetThread) {
        const createdThread = await tx.planChatThread.create({
          data: {
            userId,
            trainingPlanId: sourceVersion.trainingPlanId,
            planVersionId: createdVersion.id,
            title: sourceThread.title
          },
          select: {
            id: true
          }
        });

        const sourceMessages = await tx.planChatMessage.findMany({
          where: {
            threadId: sourceThread.id
          },
          orderBy: {
            createdAt: "asc"
          },
          select: {
            role: true,
            content: true,
            sourceTweakRequestId: true
          }
        });

        if (sourceMessages.length > 0) {
          await tx.planChatMessage.createMany({
            data: sourceMessages.map((message) => ({
              threadId: createdThread.id,
              role: message.role,
              content: message.content,
              sourceTweakRequestId: message.sourceTweakRequestId
            }))
          });
        }
      }

      await tx.planTweakRequest.update({
        where: {
          id: tweak.id
        },
        data: {
          status: "accepted",
          llmSummaryText: generated.changeSummary,
          resultPlanVersionId: createdVersion.id
        }
      });

      return {
        planVersionId: createdVersion.id
      };
    });

    return NextResponse.json(
      {
        tweakRequestId: tweak.id,
        sourcePlanVersionId: sourceVersion.id,
        resultPlanVersionId: result.planVersionId,
        changed: generated.changed,
        changeSummary: generated.changeSummary,
        retryCount: generated.retryCount
      },
      { status: 201 }
    );
  } catch (error) {
    if (tweakRequestId) {
      await prisma.planTweakRequest.update({
        where: {
          id: tweakRequestId
        },
        data: {
          status: "failed",
          llmSummaryText: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    if (error instanceof PlanTweakError) {
      if (error.code === "VALIDATION_FAILED") {
        return jsonError(502, "PLAN_VALIDATION_FAILED", "Model output failed schema validation.", error.details);
      }

      if (error.code === "INVALID_RESPONSE") {
        return jsonError(502, "PLAN_INVALID_RESPONSE", "Model returned invalid tweak response.", error.details);
      }

      return jsonError(502, "PLAN_LLM_FAILURE", "Plan tweak request failed.", error.details);
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to process tweak request.");
  }
}
