import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      userId
    },
    include: {
      currentPlanVersion: true
    }
  });

  if (!plan || !plan.currentPlanVersion) {
    notFound();
  }

  return (
    <>
      <section className="card">
        <h1>{plan.name}</h1>
        <p>Version created at {plan.currentPlanVersion.createdAt.toISOString()}</p>
        <div className="link-row">
          <Link href="/dashboard">Back to dashboard</Link>
          <Link href="/onboarding">Update questionnaire</Link>
        </div>
      </section>
      <section className="card">
        <h2>Plan JSON</h2>
        <pre>{JSON.stringify(plan.currentPlanVersion.planJson, null, 2)}</pre>
      </section>
    </>
  );
}
