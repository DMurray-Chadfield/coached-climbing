"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  planId: string;
  label?: string;
  variant?: "solid" | "link";
};

type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

type GenerateResponse = {
  jobId: string;
  planId: string;
  status: JobStatus;
  planVersionId?: string;
};

type GenerateError = {
  error: {
    code: string;
    message: string;
  };
};

type JobStatusResponse = {
  jobId: string;
  planId: string;
  status: JobStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  retryCount: number | null;
  planVersionId: string | null;
  error: null | {
    code: string;
    message: string;
    details: unknown;
  };
};

type ActiveJobResponse = {
  job: null | {
    jobId: string;
    status: JobStatus;
    createdAt: string;
    startedAt: string | null;
  };
};

type StoredJob = {
  jobId: string;
  idempotencyKey?: string;
  createdAt: string;
};

export function GeneratePlanButton({ planId, label = "Generate Plan", variant = "solid" }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const pollTimeoutRef = useRef<number | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const storageKey = `planGenerationJob:${planId}`;

  function clearPollTimer() {
    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }

  function readStoredJob(): StoredJob | null {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredJob;
      if (!parsed || typeof parsed.jobId !== "string" || typeof parsed.createdAt !== "string") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeStoredJob(stored: StoredJob) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  }

  function clearStoredJob() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  function computePollDelay(createdAtIso: string): number {
    const createdAtMs = Date.parse(createdAtIso);
    const elapsedMs = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : 0;
    return elapsedMs > 90_000 ? 7_000 : 2_000;
  }

  function startPolling(jobId: string, createdAtIso: string) {
    if (activeJobIdRef.current === jobId && isLoading) {
      return;
    }

    activeJobIdRef.current = jobId;
    setIsLoading(true);
    setJobStatus((current) => current ?? "queued");
    clearPollTimer();

    const pollOnce = async () => {
      const currentJobId = activeJobIdRef.current;
      if (!currentJobId || currentJobId !== jobId) return;

      let response: Response;
      try {
        response = await fetch(`/api/plans/generate/jobs/${jobId}`, { cache: "no-store" });
      } catch {
        pollTimeoutRef.current = window.setTimeout(pollOnce, computePollDelay(createdAtIso));
        return;
      }

      if (!response.ok) {
        clearStoredJob();
        setIsLoading(false);
        setJobStatus(null);
        const body = (await response.json().catch(() => null)) as GenerateError | null;
        setError(body?.error?.message ?? "Failed to load generation status.");
        return;
      }

      const body = (await response.json()) as JobStatusResponse;
      setJobStatus(body.status);

      if (body.status === "succeeded") {
        clearStoredJob();
        setIsLoading(false);
        setError(null);
        router.push(`/plans/${body.planId}`);
        router.refresh();
        return;
      }

      if (body.status === "failed" || body.status === "canceled") {
        clearStoredJob();
        setIsLoading(false);
        setJobStatus(null);
        setError(body.error?.message ?? "Plan generation failed.");
        return;
      }

      pollTimeoutRef.current = window.setTimeout(pollOnce, computePollDelay(createdAtIso));
    };

    void pollOnce();
  }

  useEffect(() => {
    const stored = readStoredJob();
    if (stored) {
      startPolling(stored.jobId, stored.createdAt);
      return;
    }

    const resumeFromServer = async () => {
      const response = await fetch(`/api/plans/generate/active?planId=${planId}`, { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as ActiveJobResponse;
      if (!body.job) return;
      writeStoredJob({ jobId: body.job.jobId, createdAt: body.job.createdAt });
      startPolling(body.job.jobId, body.job.createdAt);
    };

    void resumeFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const stored = readStoredJob();
      if (!stored) return;
      startPolling(stored.jobId, stored.createdAt);
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearPollTimer();
      activeJobIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  async function onGenerate() {
    setError(null);
    if (isLoading) return;

    setIsLoading(true);
    setJobStatus("queued");

    const idempotencyKey =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const response = await fetch("/api/plans/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({ planId })
    });

    const body = (await response.json()) as GenerateResponse | GenerateError;

    if (!response.ok) {
      setIsLoading(false);
      setJobStatus(null);
      setError("error" in body ? body.error.message : "Failed to generate plan.");
      return;
    }

    if (!("jobId" in body) || !body.jobId) {
      setIsLoading(false);
      setJobStatus(null);
      setError("Failed to start plan generation.");
      return;
    }

    writeStoredJob({ jobId: body.jobId, idempotencyKey, createdAt: new Date().toISOString() });

    if (body.status === "succeeded") {
      clearStoredJob();
      setIsLoading(false);
      setJobStatus(null);
      router.push(`/plans/${body.planId}`);
      router.refresh();
      return;
    }

    startPolling(body.jobId, new Date().toISOString());
  }

  const trackerTitle =
    jobStatus === "queued" ? "Starting plan generation..." : "Generating your plan...";
  const trackerBody =
    jobStatus === "queued"
      ? "This should start in a few seconds."
      : "Hang tight. This usually takes 1-3 minutes. You can come back later and your plan will be ready when you return.";

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
            <strong>{trackerTitle}</strong>
            <p>{trackerBody}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
