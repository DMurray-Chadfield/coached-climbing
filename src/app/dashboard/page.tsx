import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
        <p>Generate a fresh plan or open an existing one.</p>
        <div className="link-row">
          <Link href="/onboarding">Edit questionnaire</Link>
        </div>
        <GeneratePlanButton />
      </section>

      <section className="card">
        <h2>Your Plans</h2>
        {plans.length === 0 ? (
          <p>No plans yet. Complete onboarding and generate your first plan.</p>
        ) : (
          <ul>
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link href={`/plans/${plan.id}`}>{plan.name}</Link> · Updated {plan.updatedAt.toISOString()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
