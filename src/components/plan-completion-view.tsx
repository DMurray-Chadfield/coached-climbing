"use client";

import { useEffect, useMemo, useState } from "react";
import { parseExecutiveSummary } from "@/lib/services/plan-summary";

type PlanApiResponse = {
  id: string;
  name: string;
  goal: string | null;
  current_plan_version_id: string;
  current_plan_version: {
    id: string;
    versionNumber: number;
    planJson: Record<string, unknown>;
    createdAt: string;
  };
  completion: CompletionSnapshot;
  notes: NotesSnapshot;
};

type CompletionSnapshot = {
  plan_completion_percent: number;
  completed_sessions: number;
  total_sessions: number;
  completed_activities: number;
  total_activities: number;
  sessions: Array<{
    week_number: number;
    session_number: number;
    completed: boolean;
    completion_source: "manual" | "derived_all_activities" | null;
    completion_percent: number;
  }>;
  activities: Array<{
    week_number: number;
    session_number: number;
    activity_id: string;
    completed: boolean;
  }>;
};

type NotesSnapshot = {
  sessions: Array<{
    week_number: number;
    session_number: number;
    note_text: string;
  }>;
  activities: Array<{
    week_number: number;
    session_number: number;
    activity_id: string;
    note_text: string;
  }>;
};

type WeekView = {
  weekNumber: number;
  focus: string;
  sessions: SessionView[];
};

type SessionView = {
  sessionNumber: number;
  sessionType: string;
  description: string;
  estimatedMinutes: number | null;
  activities: Array<{
    activityId: string;
    name: string;
    description: string;
    durationMinutes: number | null;
  }>;
};

type Props = {
  planId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  return Number.isInteger(value) ? Number(value) : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseWeeks(planJson: Record<string, unknown>): WeekView[] {
  const weeks = Array.isArray(planJson.weeks) ? planJson.weeks : [];
  const parsed: WeekView[] = [];

  for (const week of weeks) {
    if (!isRecord(week)) {
      continue;
    }

    const weekNumber = asNumber(week.week_number);
    const sessions = Array.isArray(week.sessions) ? week.sessions : [];

    if (!weekNumber) {
      continue;
    }

    const parsedSessions: SessionView[] = [];

    for (const session of sessions) {
      if (!isRecord(session)) {
        continue;
      }

      const sessionNumber = asNumber(session.session_number);
      if (!sessionNumber) {
        continue;
      }

      const activitiesRaw = Array.isArray(session.activities) ? session.activities : [];
      const activities = activitiesRaw
        .map((activity) => {
          if (!isRecord(activity)) {
            return null;
          }

          const activityId = asText(activity.activity_id);
          if (!activityId) {
            return null;
          }

          return {
            activityId,
            name: asText(activity.name),
            description: asText(activity.description),
            durationMinutes: asNumber(activity.duration_minutes)
          };
        })
        .filter((activity): activity is NonNullable<typeof activity> => activity !== null);

      parsedSessions.push({
        sessionNumber,
        sessionType: asText(session.session_type),
        description: asText(session.description),
        estimatedMinutes: asNumber(session.estimated_minutes),
        activities
      });
    }

    parsed.push({
      weekNumber,
      focus: asText(week.focus),
      sessions: parsedSessions
    });
  }

  return parsed;
}

export function PlanCompletionView({ planId }: Props) {
  const [plan, setPlan] = useState<PlanApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);
  const [sessionNoteDrafts, setSessionNoteDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let ignore = false;

    async function loadPlan() {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/plans/${planId}`, {
        cache: "no-store"
      });

      const body = (await response.json().catch(() => null)) as PlanApiResponse | { error?: { message?: string } } | null;

      if (ignore) {
        return;
      }

      if (!response.ok) {
        setError(body && "error" in body ? body.error?.message ?? "Failed to load plan." : "Failed to load plan.");
        setIsLoading(false);
        return;
      }

      setPlan(body as PlanApiResponse);
      setIsLoading(false);
    }

    void loadPlan();

    return () => {
      ignore = true;
    };
  }, [planId]);

  const weeks = useMemo(() => {
    if (!plan) {
      return [] as WeekView[];
    }

    return parseWeeks(plan.current_plan_version.planJson);
  }, [plan]);

  const executiveSummary = useMemo(() => {
    if (!plan) {
      return null;
    }

    return parseExecutiveSummary(plan.current_plan_version.planJson);
  }, [plan]);

  useEffect(() => {
    if (weeks.length === 0) {
      setSelectedWeekNumber(null);
      return;
    }

    if (selectedWeekNumber === null || !weeks.some((week) => week.weekNumber === selectedWeekNumber)) {
      setSelectedWeekNumber(weeks[0]?.weekNumber ?? null);
    }
  }, [weeks, selectedWeekNumber]);

  const sessionMap = useMemo(() => {
    const map = new Map<string, CompletionSnapshot["sessions"][number]>();

    if (!plan) {
      return map;
    }

    for (const session of plan.completion.sessions) {
      map.set(`${session.week_number}:${session.session_number}`, session);
    }

    return map;
  }, [plan]);

  const activityMap = useMemo(() => {
    const map = new Map<string, boolean>();

    if (!plan) {
      return map;
    }

    for (const activity of plan.completion.activities) {
      map.set(`${activity.week_number}:${activity.session_number}:${activity.activity_id}`, activity.completed);
    }

    return map;
  }, [plan]);

  useEffect(() => {
    if (!plan) {
      return;
    }

    const sessionDrafts: Record<string, string> = {};
    for (const note of plan.notes.sessions) {
      sessionDrafts[`${note.week_number}:${note.session_number}`] = note.note_text;
    }

    setSessionNoteDrafts(sessionDrafts);
  }, [plan]);

  async function patchCompletion(url: string, body: Record<string, unknown>, key: string) {
    if (!plan) {
      return;
    }

    setIsUpdating(key);
    setError(null);

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          completion: CompletionSnapshot;
        }
      | { error?: { message?: string } }
      | null;

    setIsUpdating(null);

    if (!response.ok) {
      setError(payload && "error" in payload ? payload.error?.message ?? "Failed to update completion." : "Failed to update completion.");
      return;
    }

    if (!payload || !("completion" in payload)) {
      setError("Failed to update completion.");
      return;
    }

    setPlan((current) =>
      current
        ? {
            ...current,
            completion: payload.completion
          }
        : current
    );
  }

  function onToggleActivity(weekNumber: number, sessionNumber: number, activityId: string, completed: boolean) {
    if (!plan) {
      return;
    }

    void patchCompletion(
      `/api/plans/${plan.id}/activities/completion`,
      {
        planVersionId: plan.current_plan_version.id,
        weekNumber,
        sessionNumber,
        activityId,
        completed
      },
      `a:${weekNumber}:${sessionNumber}:${activityId}`
    );
  }

  function onToggleSession(weekNumber: number, sessionNumber: number, completed: boolean) {
    if (!plan) {
      return;
    }

    void patchCompletion(
      `/api/plans/${plan.id}/sessions/completion`,
      {
        planVersionId: plan.current_plan_version.id,
        weekNumber,
        sessionNumber,
        completed
      },
      `s:${weekNumber}:${sessionNumber}`
    );
  }

  async function patchNotes(url: string, body: Record<string, unknown>, key: string) {
    if (!plan) {
      return;
    }

    setIsUpdating(key);
    setError(null);

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          notes: NotesSnapshot;
        }
      | { error?: { message?: string } }
      | null;

    setIsUpdating(null);

    if (!response.ok) {
      setError(payload && "error" in payload ? payload.error?.message ?? "Failed to save note." : "Failed to save note.");
      return;
    }

    if (!payload || !("notes" in payload)) {
      setError("Failed to save note.");
      return;
    }

    setPlan((current) =>
      current
        ? {
            ...current,
            notes: payload.notes
          }
        : current
    );
  }

  if (isLoading) {
    return <section className="card">Loading plan...</section>;
  }

  if (error && !plan) {
    return (
      <section className="card">
        <p className="error">{error}</p>
      </section>
    );
  }

  if (!plan) {
    return (
      <section className="card">
        <p className="error">Plan data unavailable.</p>
      </section>
    );
  }

  const selectedWeek = weeks.find((week) => week.weekNumber === selectedWeekNumber) ?? weeks[0];

  return (
    <>
      {executiveSummary ? (
        <section className="card">
          <article className="plan-summary-card">
            <h2>Summary</h2>
            <div className="plan-summary-section">
              <h3>Phase-by-Phase Weekly Split</h3>
              <p className="summary-text-block">{executiveSummary.phase_by_phase_weekly_split}</p>
            </div>

            <div className="plan-summary-section">
              <h3>Program Snapshot</h3>
              <p className="summary-text-block">{executiveSummary.program_snapshot}</p>
            </div>
          </article>
        </section>
      ) : null}

      <section className="card plan-progress-card">
        <h2>Progress</h2>
        <div className="progress-metrics">
          <article className="metric-card">
            <h3>Plan Completion</h3>
            <p>
              <strong>{plan.completion.plan_completion_percent}%</strong> ({plan.completion.completed_activities}/
              {plan.completion.total_activities} activities)
            </p>
          </article>
          <article className="metric-card">
            <h3>Sessions Completed</h3>
            <p>
              <strong>{plan.completion.completed_sessions}</strong>/{plan.completion.total_sessions}
            </p>
          </article>
        </div>
        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${plan.completion.plan_completion_percent}%` }} />
        </div>
        {error ? <p className="error">{error}</p> : null}

        <nav className="week-tabs" aria-label="Plan weeks">
          {weeks.map((week) => (
            <button
              key={week.weekNumber}
              type="button"
              className={`week-tab ${selectedWeek?.weekNumber === week.weekNumber ? "is-active" : ""}`}
              onClick={() => setSelectedWeekNumber(week.weekNumber)}
            >
              Week {week.weekNumber}
            </button>
          ))}
        </nav>

        {selectedWeek ? (
          <article key={selectedWeek.weekNumber} className="week-block">
            <h3 className="week-heading">
              <span className="week-title">Week {selectedWeek.weekNumber}</span>
              {selectedWeek.focus ? <span className="week-focus">{selectedWeek.focus}</span> : null}
            </h3>

            {selectedWeek.sessions.map((session) => {
              const sessionCompletion = sessionMap.get(`${selectedWeek.weekNumber}:${session.sessionNumber}`);

              return (
                <div key={`${selectedWeek.weekNumber}:${session.sessionNumber}`} className="session-block">
                  <label className="completion-row session-row">
                    <input
                      type="checkbox"
                      checked={sessionCompletion?.completed ?? false}
                      disabled={isUpdating === `s:${selectedWeek.weekNumber}:${session.sessionNumber}`}
                      onChange={(event) =>
                        onToggleSession(selectedWeek.weekNumber, session.sessionNumber, event.currentTarget.checked)
                      }
                    />
                    <span>
                      Session {session.sessionNumber}: {session.sessionType || "Session"}
                    </span>
                  </label>

                  {session.description ? <p className="session-description">{session.description}</p> : null}
                  <div className="note-card">
                    <label htmlFor={`session-note-${selectedWeek.weekNumber}-${session.sessionNumber}`}>
                      Session Notes
                    </label>
                    <textarea
                      id={`session-note-${selectedWeek.weekNumber}-${session.sessionNumber}`}
                      rows={3}
                      placeholder="Notes for coach"
                      value={sessionNoteDrafts[`${selectedWeek.weekNumber}:${session.sessionNumber}`] ?? ""}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;
                        setSessionNoteDrafts((current) => ({
                          ...current,
                          [`${selectedWeek.weekNumber}:${session.sessionNumber}`]: nextValue
                        }));
                      }}
                    />
                    <button
                      type="button"
                      className="note-save-btn"
                      disabled={isUpdating === `sn:${selectedWeek.weekNumber}:${session.sessionNumber}`}
                      onClick={() =>
                        patchNotes(
                          `/api/plans/${plan.id}/sessions/notes`,
                          {
                            planVersionId: plan.current_plan_version.id,
                            weekNumber: selectedWeek.weekNumber,
                            sessionNumber: session.sessionNumber,
                            noteText: sessionNoteDrafts[`${selectedWeek.weekNumber}:${session.sessionNumber}`] ?? ""
                          },
                          `sn:${selectedWeek.weekNumber}:${session.sessionNumber}`
                        )
                      }
                    >
                      {isUpdating === `sn:${selectedWeek.weekNumber}:${session.sessionNumber}`
                        ? "Saving..."
                        : "Save Coach Session Note"}
                    </button>
                  </div>
                  <ul className="session-activity-list">
                    {session.activities.map((activity) => {
                      const activityKey = `${selectedWeek.weekNumber}:${session.sessionNumber}:${activity.activityId}`;
                      const checked = activityMap.get(activityKey) ?? false;
                      const activityName = activity.name || activity.activityId;
                      const helpMessage = [
                        `How do I do this activity?`,
                        `Week ${selectedWeek.weekNumber}, Session ${session.sessionNumber}: ${activityName}`,
                        activity.durationMinutes ? `Planned duration: ${activity.durationMinutes} min` : null,
                        activity.description ? `Plan notes: ${activity.description}` : null,
                        "Please explain setup, key cues, common mistakes, how to scale it, and how to judge completion."
                      ]
                        .filter((line): line is string => Boolean(line))
                        .join("\n");
                      return (
                        <li key={activity.activityId}>
                          <div className="completion-row">
                            <label className="completion-row-label">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={
                                  isUpdating ===
                                  `a:${selectedWeek.weekNumber}:${session.sessionNumber}:${activity.activityId}`
                                }
                                onChange={(event) =>
                                  onToggleActivity(
                                    selectedWeek.weekNumber,
                                    session.sessionNumber,
                                    activity.activityId,
                                    event.currentTarget.checked
                                  )
                                }
                              />
                              <span>
                                <strong>{activityName}</strong>
                                {activity.durationMinutes ? ` (${activity.durationMinutes} min)` : ""}
                              </span>
                            </label>
                            <button
                              type="button"
                              className="activity-help-btn"
                              aria-label={`Ask coach how to do ${activityName}`}
                              title="Ask coach how to do this"
                              disabled={isLoading}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                window.dispatchEvent(
                                  new CustomEvent("plan-chat:ask", {
                                    detail: { content: helpMessage }
                                  })
                                );
                                document.getElementById("plan-chat")?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start"
                                });
                              }}
                            >
                              ?
                            </button>
                          </div>
                          {activity.description ? <p className="activity-description">{activity.description}</p> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </article>
        ) : null}

        <details className="plan-json-details">
          <summary>Plan JSON</summary>
          <pre className="plan-json-pre">{JSON.stringify(plan.current_plan_version.planJson, null, 2)}</pre>
        </details>
      </section>
    </>
  );
}
