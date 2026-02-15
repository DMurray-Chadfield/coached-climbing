"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  planId: string;
  label?: string;
  variant?: "solid" | "link";
};

type GenerateSuccess = {
  planId: string;
};

type GenerateError = {
  error: {
    message: string;
  };
};

export function GeneratePlanButton({ planId, label = "Generate Plan", variant = "solid" }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onGenerate() {
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/plans/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ planId })
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
    <>
      <div className={variant === "link" ? "inline-action" : undefined}>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className={variant === "link" ? "link-row-button" : undefined}
        >
          {isLoading ? "Generating..." : label}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </div>
      {isLoading ? (
        <div className="generation-tracker" role="status" aria-live="polite">
          <div className="generation-tracker-spinner" aria-hidden="true" />
          <div>
            <strong>Generating your plan with AI...</strong>
            <p>Hang tight. This usually takes 1-3 minutes.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
