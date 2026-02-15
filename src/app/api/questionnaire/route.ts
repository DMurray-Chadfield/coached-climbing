import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { questionnaireSchema } from "@/lib/schemas/questionnaire";
import { jsonError } from "@/lib/api";
import { requireUserId } from "@/lib/server/auth-guard";

export async function GET() {
  try {
    const userId = await requireUserId();

    const latest = await prisma.questionnaireResponse.findFirst({
      where: { userId },
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
    const parsed = questionnaireSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(400, "INVALID_PAYLOAD", "Invalid questionnaire payload", parsed.error.flatten());
    }

    const saved = await prisma.questionnaireResponse.create({
      data: {
        userId,
        data: parsed.data
      },
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
