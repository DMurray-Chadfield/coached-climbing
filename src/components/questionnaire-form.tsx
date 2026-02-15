"use client";

import { useState } from "react";

type Props = {
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

export function QuestionnaireForm({ initialData }: Props) {
  const [age, setAge] = useState(asNumber(initialData?.age, 29));
  const [sex, setSex] = useState(asString(initialData?.sex));
  const [planLengthWeeks, setPlanLengthWeeks] = useState(asNumber(initialData?.plan_length_weeks, 12));
  const [targetType, setTargetType] = useState(asString((initialData?.target_event as Record<string, unknown>)?.type));
  const [targetDate, setTargetDate] = useState(asString((initialData?.target_event as Record<string, unknown>)?.date));
  const [targetDetails, setTargetDetails] = useState(
    asString((initialData?.target_event as Record<string, unknown>)?.details)
  );
  const [boulderGrade, setBoulderGrade] = useState(
    asString((initialData?.current_level as Record<string, unknown>)?.boulder_grade)
  );
  const [routeGrade, setRouteGrade] = useState(
    asString((initialData?.current_level as Record<string, unknown>)?.route_grade)
  );
  const [contextNotes, setContextNotes] = useState(
    asString((initialData?.current_level as Record<string, unknown>)?.context_notes)
  );
  const [goals, setGoals] = useState(
    Array.isArray(initialData?.goals) ? (initialData?.goals as string[]).join(", ") : "Improve technique"
  );
  const [recentTraining, setRecentTraining] = useState(
    asString((initialData?.training_history_and_load as Record<string, unknown>)?.recent_training_summary)
  );
  const [pastExercises, setPastExercises] = useState(
    Array.isArray((initialData?.training_history_and_load as Record<string, unknown>)?.past_exercises)
      ? ((initialData?.training_history_and_load as Record<string, unknown>)?.past_exercises as string[]).join(", ")
      : ""
  );
  const [loadTolerance, setLoadTolerance] = useState(
    asString((initialData?.training_history_and_load as Record<string, unknown>)?.load_tolerance)
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
      age: Number(age),
      sex,
      plan_length_weeks: Number(planLengthWeeks),
      target_event: targetType
        ? {
            type: targetType,
            ...(targetDate ? { date: targetDate } : {}),
            ...(targetDetails ? { details: targetDetails } : {})
          }
        : undefined,
      current_level: {
        boulder_grade: boulderGrade,
        route_grade: routeGrade,
        context_notes: contextNotes
      },
      goals: goals
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      training_history_and_load: {
        recent_training_summary: recentTraining,
        past_exercises: pastExercises
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        load_tolerance: loadTolerance
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

    setStatus("Saved. You can now generate a plan from the dashboard.");
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Age
        <input type="number" min={13} max={100} value={age} onChange={(event) => setAge(Number(event.target.value))} />
      </label>
      <label>
        Sex
        <input value={sex} onChange={(event) => setSex(event.target.value)} required />
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
        Target Event Type
        <input value={targetType} onChange={(event) => setTargetType(event.target.value)} />
      </label>
      <label>
        Target Event Date
        <input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
      </label>
      <label>
        Target Event Details
        <textarea value={targetDetails} onChange={(event) => setTargetDetails(event.target.value)} rows={2} />
      </label>
      <label>
        Boulder Grade
        <input value={boulderGrade} onChange={(event) => setBoulderGrade(event.target.value)} />
      </label>
      <label>
        Route Grade
        <input value={routeGrade} onChange={(event) => setRouteGrade(event.target.value)} />
      </label>
      <label>
        Current Level Notes
        <textarea value={contextNotes} onChange={(event) => setContextNotes(event.target.value)} rows={2} />
      </label>
      <label>
        Goals (comma separated)
        <textarea value={goals} onChange={(event) => setGoals(event.target.value)} rows={2} required />
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
        Past Exercises (comma separated)
        <input value={pastExercises} onChange={(event) => setPastExercises(event.target.value)} />
      </label>
      <label>
        Load Tolerance
        <input value={loadTolerance} onChange={(event) => setLoadTolerance(event.target.value)} required />
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
