import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GeneratePlanButton } from "@/components/generate-plan-button";
import { PlanCompletionView } from "@/components/plan-completion-view";
import { PlanChatPanel } from "@/components/plan-chat-panel";

export default async function PlanDetailPage({
  params
}: {
  params: { planId: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const plan = await prisma.trainingPlan.findFirst({
    where: {
      id: params.planId,
      userId,
      deletedAt: null
    },
    include: {
      currentPlanVersion: true
    }
  });
  const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  if (!plan) {
    notFound();
  }

  if (!plan.currentPlanVersion) {
    return (
      <section className="card">
        <h1>{plan.name}</h1>
        <p>This is a draft plan. Complete onboarding and generate it.</p>
        <div className="link-row">
          <Link href={`/onboarding?planId=${plan.id}`}>Complete onboarding</Link>
          <Link href="/dashboard">Back to dashboard</Link>
          <GeneratePlanButton planId={plan.id} />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <h1>{plan.name}</h1>
        <p>Version created at {dateTimeFormatter.format(plan.currentPlanVersion.createdAt)}</p>
        <div className="link-row">
          <Link href="/dashboard">Back to dashboard</Link>
          <Link href={`/onboarding?planId=${plan.id}`}>Update onboarding for this plan</Link>
          <GeneratePlanButton planId={plan.id} label="Regenerate" />
        </div>
      </section>
      <PlanChatPanel planId={plan.id} planVersionId={plan.currentPlanVersion.id} />
      <PlanCompletionView planId={plan.id} />
    </>
  );
}
