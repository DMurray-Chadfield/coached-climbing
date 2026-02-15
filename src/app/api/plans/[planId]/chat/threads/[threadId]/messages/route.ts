import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";
import { PlanChatError, generatePlanChatReply } from "@/lib/services/plan-chat";

const postSchema = z.object({
  content: z.string().min(1).max(4000),
  sourceTweakRequestId: z.string().cuid().optional()
});

export async function GET(
  _request: Request,
  context: {
    params: { planId: string; threadId: string };
  }
) {
  try {
    const userId = await requireUserId();

    const thread = await prisma.planChatThread.findFirst({
      where: {
        id: context.params.threadId,
        trainingPlanId: context.params.planId,
        userId
      },
      select: {
        id: true
      }
    });

    if (!thread) {
      return jsonError(404, "NOT_FOUND", "Chat thread not found.");
    }

    const messages = await prisma.planChatMessage.findMany({
      where: {
        threadId: thread.id
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true,
        role: true,
        content: true,
        sourceTweakRequestId: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      messages: messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString()
      }))
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to list chat messages.");
  }
}

export async function POST(
  request: Request,
  context: {
    params: { planId: string; threadId: string };
  }
) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => null);
    const parsed = postSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(400, "INVALID_PAYLOAD", "Invalid chat message payload.", parsed.error.flatten());
    }

    const thread = await prisma.planChatThread.findFirst({
      where: {
        id: context.params.threadId,
        trainingPlanId: context.params.planId,
        userId
      },
      select: {
        id: true,
        trainingPlanId: true,
        planVersionId: true,
        planVersion: {
          select: {
            planJson: true
          }
        }
      }
    });

    if (!thread) {
      return jsonError(404, "NOT_FOUND", "Chat thread not found.");
    }

    if (parsed.data.sourceTweakRequestId) {
      const tweak = await prisma.planTweakRequest.findFirst({
        where: {
          id: parsed.data.sourceTweakRequestId,
          trainingPlanId: thread.trainingPlanId,
          userId
        },
        select: {
          id: true
        }
      });

      if (!tweak) {
        return jsonError(404, "NOT_FOUND", "Referenced tweak request not found.");
      }
    }

    const history = await prisma.planChatMessage.findMany({
      where: {
        threadId: thread.id
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        role: true,
        content: true
      }
    });

    const assistantContent = await generatePlanChatReply({
      planJson: thread.planVersion.planJson as Record<string, unknown>,
      history: history.map((item) => ({
        role: item.role,
        content: item.content
      })),
      userMessage: parsed.data.content
    });

    const result = await prisma.$transaction(async (tx) => {
      const userMessage = await tx.planChatMessage.create({
        data: {
          threadId: thread.id,
          role: "user",
          content: parsed.data.content,
          sourceTweakRequestId: parsed.data.sourceTweakRequestId
        },
        select: {
          id: true,
          role: true,
          content: true,
          sourceTweakRequestId: true,
          createdAt: true
        }
      });

      const assistantMessage = await tx.planChatMessage.create({
        data: {
          threadId: thread.id,
          role: "assistant",
          content: assistantContent
        },
        select: {
          id: true,
          role: true,
          content: true,
          sourceTweakRequestId: true,
          createdAt: true
        }
      });

      await tx.planChatThread.update({
        where: {
          id: thread.id
        },
        data: {
          updatedAt: new Date()
        }
      });

      return {
        userMessage,
        assistantMessage
      };
    });

    return NextResponse.json(
      {
        userMessage: {
          ...result.userMessage,
          createdAt: result.userMessage.createdAt.toISOString()
        },
        assistantMessage: {
          ...result.assistantMessage,
          createdAt: result.assistantMessage.createdAt.toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    if (error instanceof PlanChatError) {
      if (error.code === "INVALID_RESPONSE") {
        return jsonError(502, "CHAT_INVALID_RESPONSE", "Model returned an invalid chat response.", error.details);
      }

      return jsonError(502, "CHAT_LLM_FAILURE", "Chat request failed.", error.details);
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to create chat messages.");
  }
}
