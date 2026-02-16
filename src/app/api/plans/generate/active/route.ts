import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";

const querySchema = z.object({
  planId: z.string().cuid()
});

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      planId: url.searchParams.get("planId")
    });

    if (!parsedQuery.success) {
      return jsonError(400, "INVALID_QUERY", "planId is required.", parsedQuery.error.flatten());
    }

    const job = await prisma.planGenerationJob.findFirst({
      where: {
        userId,
        trainingPlanId: parsedQuery.data.planId,
        status: {
          in: ["queued", "running"]
        },
        trainingPlan: {
          deletedAt: null
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        startedAt: true
      }
    });

    return NextResponse.json({
      job: job
        ? {
            jobId: job.id,
            status: job.status,
            createdAt: job.createdAt.toISOString(),
            startedAt: job.startedAt?.toISOString() ?? null
          }
        : null
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError(401, "UNAUTHORIZED", "You must be signed in.");
    }

    console.error("Unexpected active generation job error", error);
    return jsonError(500, "INTERNAL_ERROR", "Unable to load active generation job.");
  }
}

