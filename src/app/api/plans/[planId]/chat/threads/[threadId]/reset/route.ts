import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";

export async function POST(
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

    await prisma.$transaction(async (tx) => {
      await tx.planChatMessage.deleteMany({
        where: {
          threadId: thread.id
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
    });

    return NextResponse.json({
      reset: true
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to reset chat thread.");
  }
}
