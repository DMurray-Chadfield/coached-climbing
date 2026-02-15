import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreatePlanButton } from "@/components/create-plan-button";
import { GeneratePlanButton } from "@/components/generate-plan-button";
import { DeletePlanButton } from "@/components/delete-plan-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const plans = await prisma.trainingPlan.findMany({
    where: { userId, deletedAt: null },
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
  const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
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
                <strong>{plan.name}</strong> · Updated {dateTimeFormatter.format(plan.updatedAt)} ·{" "}
                {plan.currentPlanVersionId ? "Generated" : "Draft"}
                <div className="link-row" style={{ marginTop: "0.4rem" }}>
                  {plan.currentPlanVersionId ? (
                    <Link className="plan-open-cta" href={`/plans/${plan.id}`}>
                      Open plan
                    </Link>
                  ) : null}
                  <Link href={`/onboarding?planId=${plan.id}`}>Onboarding</Link>
                  {!plan.currentPlanVersionId ? <GeneratePlanButton planId={plan.id} label="Generate" /> : null}
                  <DeletePlanButton planId={plan.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
