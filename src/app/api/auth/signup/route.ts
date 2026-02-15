import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { jsonError } from "@/lib/api";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional()
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", "Invalid signup payload", parsed.error.flatten());
  }

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    return jsonError(409, "EMAIL_TAKEN", "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: parsed.data.name
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  return NextResponse.json({ userId: user.id }, { status: 201 });
}
