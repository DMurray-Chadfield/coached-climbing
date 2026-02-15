"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GenerateSuccess = {
  planId: string;
};

type GenerateError = {
  error: {
    message: string;
  };
};

export function GeneratePlanButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onGenerate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/plans/generate", {
      method: "POST"
    });

    const body = (await response.json()) as GenerateSuccess | GenerateError;

    setIsLoading(false);

    if (!response.ok) {
      setError("error" in body ? body.error.message : "Failed to generate plan.");
      return;
    }

    if ("planId" in body) {
      router.push(`/plans/${body.planId}`);
      router.refresh();
    }
  }

  return (
    <div>
      <button type="button" onClick={onGenerate} disabled={isLoading}>
        {isLoading ? "Generating..." : "Generate Plan"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
