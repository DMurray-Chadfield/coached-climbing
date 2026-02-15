"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreatePlanSuccess = {
  planId: string;
};

type CreatePlanError = {
  error: {
    message: string;
  };
};

export function CreatePlanButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onCreate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/plans", {
      method: "POST"
    });

    const body = (await response.json()) as CreatePlanSuccess | CreatePlanError;
    setIsLoading(false);

    if (!response.ok) {
      setError("error" in body ? body.error.message : "Failed to create plan.");
      return;
    }

    if ("planId" in body) {
      router.push(`/onboarding?planId=${body.planId}`);
      router.refresh();
    }
  }

  return (
    <div>
      <button type="button" onClick={onCreate} disabled={isLoading}>
        {isLoading ? "Creating..." : "Create Plan"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
