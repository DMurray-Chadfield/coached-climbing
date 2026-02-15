"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  planId: string;
};

type DeleteError = {
  error?: {
    message?: string;
  };
};

export function DeletePlanButton({ planId }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (isDeleting) {
      return;
    }

    const confirmed = window.confirm("Delete this plan? It will be hidden from your dashboard.");
    if (!confirmed) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    const response = await fetch(`/api/plans/${planId}`, {
      method: "DELETE"
    });
    const body = (await response.json().catch(() => null)) as DeleteError | null;

    setIsDeleting(false);

    if (!response.ok) {
      setError(body?.error?.message ?? "Unable to delete plan.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="inline-action">
      <button type="button" className="danger-link-button" onClick={onDelete} disabled={isDeleting}>
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
