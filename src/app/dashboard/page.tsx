import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreatePlanButton } from "@/components/create-plan-button";
import { GeneratePlanButton } from "@/components/generate-plan-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const plans = await prisma.trainingPlan.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      currentPlanVersion: {
        select: {
          id: true,
          createdAt: true
        }
      }
    }
  });

  return (
    <>
      <section className="card">
        <h1>Dashboard</h1>
        <p>Start here. Create a plan, complete onboarding for that plan, then generate it.</p>
        <CreatePlanButton />
      </section>

      <section className="card">
        <h2>Your Plans</h2>
        {plans.length === 0 ? (
          <p>No plans yet. Create your first plan to begin.</p>
        ) : (
          <ul>
            {plans.map((plan) => (
              <li key={plan.id}>
                <strong>{plan.name}</strong> · Updated {plan.updatedAt.toISOString()} ·{" "}
                {plan.currentPlanVersionId ? "Generated" : "Draft"}
                <div className="link-row" style={{ marginTop: "0.4rem" }}>
                  <Link href={`/onboarding?planId=${plan.id}`}>Onboarding</Link>
                  {plan.currentPlanVersionId ? <Link href={`/plans/${plan.id}`}>Open</Link> : null}
                  <GeneratePlanButton
                    planId={plan.id}
                    label={plan.currentPlanVersionId ? "Regenerate" : "Generate"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
