import { describe, expect, it } from "vitest";
import {
  compactCompletionContext,
  compactNotesContext,
  compactOnboardingContext
} from "@/lib/services/plan-chat-context";
import type { CompletionSnapshot } from "@/lib/services/plan-completion";
import type { NotesSnapshot } from "@/lib/services/plan-notes";

function buildCompletionSnapshot(): CompletionSnapshot {
  return {
    plan_completion_percent: 42,
    completed_sessions: 2,
    total_sessions: 5,
    completed_activities: 6,
    total_activities: 14,
    sessions: [
      { week_number: 1, session_number: 1, completed: true, completion_source: "manual", completion_percent: 100 },
      { week_number: 1, session_number: 2, completed: true, completion_source: "manual", completion_percent: 100 },
      { week_number: 2, session_number: 1, completed: false, completion_source: null, completion_percent: 25 },
      { week_number: 2, session_number: 2, completed: false, completion_source: null, completion_percent: 0 }
    ],
    activities: []
  };
}

describe("plan-chat context compaction", () => {
  it("keeps only key onboarding fields", () => {
    const compacted = compactOnboardingContext({
      age: 32,
      sessions_per_week: 4,
      plan_length_weeks: 10,
      target_focus: {
        summary: "Boulder power endurance",
        date: "2026-04-10"
      },
      current_level_summary: "Climbing V6",
      training_history_and_load: {
        recent_training_summary: "3 sessions per week for 6 months"
      },
      injuries_and_constraints: "Mild pulley sensitivity",
      notes: "Prefer weekends outdoors"
    });

    expect(compacted).toEqual({
      plan_discipline: null,
      target_focus_summary: "Boulder power endurance",
      target_focus_date: "2026-04-10",
      sessions_per_week: 4,
      plan_length_weeks: 10,
      current_level_summary: "Climbing V6",
      training_history_summary: "3 sessions per week for 6 months",
      injuries_and_constraints: "Mild pulley sensitivity",
      notes: "Prefer weekends outdoors"
    });
  });

  it("summarizes completion totals and current focus", () => {
    const summary = compactCompletionContext(buildCompletionSnapshot());

    expect(summary).toEqual({
      plan_completion_percent: 42,
      completed_sessions: 2,
      total_sessions: 5,
      completed_activities: 6,
      total_activities: 14,
      current_focus: {
        week_number: 2,
        session_number: 1
      }
    });
  });

  it("orders notes by current week first, then recency, with deterministic truncation", () => {
    const notes: NotesSnapshot = {
      sessions: [
        { week_number: 1, session_number: 2, note_text: "Older week note" },
        { week_number: 2, session_number: 1, note_text: "Current week first note" },
        { week_number: 3, session_number: 1, note_text: "Later week note" }
      ],
      activities: Array.from({ length: 14 }).map((_, index) => ({
        week_number: 2,
        session_number: index + 1,
        activity_id: `a-${index + 1}`,
        note_text: `Activity note ${index + 1} ${"x".repeat(250)}`
      }))
    };

    const compacted = compactNotesContext(notes, buildCompletionSnapshot());

    expect(compacted.sessions[0]).toEqual({
      week_number: 2,
      session_number: 1,
      note_text: "Current week first note"
    });
    expect(compacted.activities).toHaveLength(12);
    expect(compacted.activities[0]?.activity_id).toBe("a-14");
    expect(compacted.activities[0]?.note_text.endsWith("...")).toBe(true);
    expect(compacted.activities[0]?.note_text.length).toBe(220);
  });
});
