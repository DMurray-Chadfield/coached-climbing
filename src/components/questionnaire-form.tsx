"use client";

import { useState } from "react";

type Props = {
  planId: string;
  initialData?: Record<string, unknown> | null;
};

type ApiError = {
  error: {
    message: string;
  };
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

export function QuestionnaireForm({ planId, initialData }: Props) {
  const [age, setAge] = useState(asNumber(initialData?.age, 29));
  const [planLengthWeeks, setPlanLengthWeeks] = useState(asNumber(initialData?.plan_length_weeks, 12));
  const [targetFocusSummary, setTargetFocusSummary] = useState(
    asString((initialData?.target_focus as Record<string, unknown>)?.summary)
  );
  const [targetFocusDate, setTargetFocusDate] = useState(
    asString((initialData?.target_focus as Record<string, unknown>)?.date)
  );
  const [currentLevelSummary, setCurrentLevelSummary] = useState(asString(initialData?.current_level_summary));
  const [recentTraining, setRecentTraining] = useState(
    asString((initialData?.training_history_and_load as Record<string, unknown>)?.recent_training_summary)
  );
  const [sessionsPerWeek, setSessionsPerWeek] = useState(asNumber(initialData?.sessions_per_week, 3));
  const [injuries, setInjuries] = useState(asString(initialData?.injuries_and_constraints));
  const [notes, setNotes] = useState(asString(initialData?.notes));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setIsLoading(true);

    const payload = {
      planId,
      age: Number(age),
      plan_length_weeks: Number(planLengthWeeks),
      target_focus: {
        summary: targetFocusSummary,
        ...(targetFocusDate ? { date: targetFocusDate } : {})
      },
      current_level_summary: currentLevelSummary,
      training_history_and_load: {
        recent_training_summary: recentTraining
      },
      sessions_per_week: Number(sessionsPerWeek),
      injuries_and_constraints: injuries,
      notes
    };

    const response = await fetch("/api/questionnaire", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    setIsLoading(false);

    if (!response.ok) {
      const body = (await response.json()) as ApiError;
      setError(body.error?.message ?? "Failed to save questionnaire.");
      return;
    }

    setStatus("Saved. Return to dashboard and generate this plan.");
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Age
        <input type="number" min={13} max={100} value={age} onChange={(event) => setAge(Number(event.target.value))} />
      </label>
      <label>
        Plan Length (weeks)
        <input
          type="number"
          min={1}
          max={52}
          value={planLengthWeeks}
          onChange={(event) => setPlanLengthWeeks(Number(event.target.value))}
          required
        />
      </label>
      <label>
        Target Focus (event + goals in one answer)
        <textarea
          value={targetFocusSummary}
          onChange={(event) => setTargetFocusSummary(event.target.value)}
          rows={2}
          required
        />
      </label>
      <label>
        Target Date (optional)
        <input type="date" value={targetFocusDate} onChange={(event) => setTargetFocusDate(event.target.value)} />
      </label>
      <label>
        Current Level Summary
        <textarea
          value={currentLevelSummary}
          onChange={(event) => setCurrentLevelSummary(event.target.value)}
          rows={3}
          placeholder="Include your boulder grade, route grade, and any context notes."
          required
        />
      </label>
      <label>
        Recent Training Summary
        <textarea
          value={recentTraining}
          onChange={(event) => setRecentTraining(event.target.value)}
          rows={2}
          required
        />
      </label>
      <label>
        Sessions Per Week
        <input
          type="number"
          min={1}
          max={14}
          value={sessionsPerWeek}
          onChange={(event) => setSessionsPerWeek(Number(event.target.value))}
          required
        />
      </label>
      <label>
        Injuries / Constraints
        <textarea value={injuries} onChange={(event) => setInjuries(event.target.value)} rows={2} required />
      </label>
      <label>
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
      </label>
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save questionnaire"}
      </button>
      {status ? <p className="success">{status}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
