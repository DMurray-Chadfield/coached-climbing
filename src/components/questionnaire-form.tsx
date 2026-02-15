"use client";

import { useRouter } from "next/navigation";
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

function asNumberString(value: unknown, fallback: string): string {
  return typeof value === "number" ? String(value) : fallback;
}

export function QuestionnaireForm({ planId, initialData }: Props) {
  const router = useRouter();
  const [planDiscipline, setPlanDiscipline] = useState(
    asString(initialData?.plan_discipline, "sport_trad")
  );
  const [age, setAge] = useState(asNumberString(initialData?.age, "3"));
  const [planLengthWeeks, setPlanLengthWeeks] = useState(asNumberString(initialData?.plan_length_weeks, "12"));
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
  const [facilitiesAndEquipment, setFacilitiesAndEquipment] = useState(
    asString(initialData?.facilities_and_equipment_available)
  );
  const [sessionsPerWeek, setSessionsPerWeek] = useState(
    asNumberString(initialData?.sessions_per_week, "3")
  );
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

    const parsedAge = Number(age);
    const parsedPlanLengthWeeks = Number(planLengthWeeks);
    const parsedSessionsPerWeek = Number(sessionsPerWeek);

    if (
      age.trim().length === 0 ||
      planLengthWeeks.trim().length === 0 ||
      sessionsPerWeek.trim().length === 0 ||
      !Number.isInteger(parsedAge) ||
      !Number.isInteger(parsedPlanLengthWeeks) ||
      !Number.isInteger(parsedSessionsPerWeek)
    ) {
      setIsLoading(false);
      setError("Please enter whole numbers for climbing age, plan length, and sessions per week.");
      return;
    }

    const payload = {
      planId,
      plan_discipline: planDiscipline,
      age: parsedAge,
      plan_length_weeks: parsedPlanLengthWeeks,
      target_focus: {
        summary: targetFocusSummary,
        ...(targetFocusDate ? { date: targetFocusDate } : {})
      },
      current_level_summary: currentLevelSummary,
      training_history_and_load: {
        recent_training_summary: recentTraining
      },
      facilities_and_equipment_available: facilitiesAndEquipment,
      sessions_per_week: parsedSessionsPerWeek,
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

    setStatus("Saved. Redirecting...");
    router.push(`/plans/${planId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Plan Type
        <select value={planDiscipline} onChange={(event) => setPlanDiscipline(event.target.value)} required>
          <option value="sport_trad">Sport/Trad</option>
          <option value="bouldering">Bouldering</option>
        </select>
      </label>
      <label>
        Climbing Age (years climbing)
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={80}
          step={1}
          value={age}
          onChange={(event) => setAge(event.target.value)}
          placeholder="Example: 3"
          required
        />
      </label>
      <label>
        Plan Length (weeks)
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={52}
          step={1}
          value={planLengthWeeks}
          onChange={(event) => setPlanLengthWeeks(event.target.value)}
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
        Facilities and Equipment Available
        <textarea
          value={facilitiesAndEquipment}
          onChange={(event) => setFacilitiesAndEquipment(event.target.value)}
          rows={2}
          placeholder="Example: commercial gym (lead + bouldering), hangboard, pull-up bar, dumbbells, no campus board."
          required
        />
      </label>
      <label>
        Sessions Per Week
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={14}
          step={1}
          value={sessionsPerWeek}
          onChange={(event) => setSessionsPerWeek(event.target.value)}
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
