import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { QuestionnaireForm } from "@/components/questionnaire-form";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage({
  searchParams
}: {
  searchParams?: {
    planId?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const planId = searchParams?.planId;

  if (!planId) {
    redirect("/dashboard");
  }

  const plan = await prisma.trainingPlan.findFirst({
    where: {
      id: planId,
      userId
    },
    select: {
      id: true
    }
  });

  if (!plan) {
    notFound();
  }

  const latest = await prisma.questionnaireResponse.findFirst({
    where: {
      userId,
      trainingPlanId: planId
    } as never,
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="card">
      <h1>Plan Onboarding</h1>
      <p>Fill this out for this specific plan, then generate it from your dashboard.</p>
      <div className="link-row">
        <Link href="/dashboard">Back to dashboard</Link>
      </div>
      <QuestionnaireForm planId={planId} initialData={(latest?.data as Record<string, unknown> | null) ?? null} />
    </section>
  );
}
