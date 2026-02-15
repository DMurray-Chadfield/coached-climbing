import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { QuestionnaireForm } from "@/components/questionnaire-form";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const latest = await prisma.questionnaireResponse.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="card">
      <h1>Onboarding Questionnaire</h1>
      <p>Complete this once, then update whenever your goals change.</p>
      <QuestionnaireForm initialData={(latest?.data as Record<string, unknown> | null) ?? null} />
    </section>
  );
}
