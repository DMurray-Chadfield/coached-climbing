import { describe, expect, it } from "vitest";
import { SessionCompletionSource } from "@prisma/client";
import { computeCompletionSnapshot, extractPlanStructure } from "@/lib/services/plan-completion";

const planJson = {
  plan_name: "Test",
  start_date: "2026-02-15",
  weeks: [
    {
      week_number: 1,
      focus: "Base",
      sessions: [
        {
          session_number: 1,
          session_type: "Climbing",
          description: "Do work",
          estimated_minutes: 75,
          activities: [
            {
              activity_id: "w1s1a1",
              name: "Warmup",
              description: "Warm",
              duration_minutes: 10,
              completion_criteria: null,
              intensity: "Low"
            },
            {
              activity_id: "w1s1a2",
              name: "Main",
              description: "Main work",
              duration_minutes: 30,
              completion_criteria: null,
              intensity: "Moderate"
            }
          ]
        }
      ]
    }
  ]
};

describe("plan-completion snapshot", () => {
  it("computes plan and session percentages from activity completion", () => {
    const structure = extractPlanStructure(planJson);

    const snapshot = computeCompletionSnapshot(
      structure,
      [
        {
          weekNumber: 1,
          sessionNumber: 1,
          activityId: "w1s1a1",
          completedAt: new Date("2026-02-15T00:00:00.000Z")
        }
      ],
      []
    );

    expect(snapshot.plan_completion_percent).toBe(50);
    expect(snapshot.completed_activities).toBe(1);
    expect(snapshot.total_activities).toBe(2);
    expect(snapshot.sessions[0]?.completion_percent).toBe(50);
    expect(snapshot.sessions[0]?.completed).toBe(false);
  });

  it("uses manual session completion independent of activity percent", () => {
    const structure = extractPlanStructure(planJson);

    const snapshot = computeCompletionSnapshot(
      structure,
      [
        {
          weekNumber: 1,
          sessionNumber: 1,
          activityId: "w1s1a1",
          completedAt: new Date("2026-02-15T00:00:00.000Z")
        }
      ],
      [
        {
          weekNumber: 1,
          sessionNumber: 1,
          completedAt: new Date("2026-02-15T00:00:00.000Z"),
          completionSource: SessionCompletionSource.manual
        }
      ]
    );

    expect(snapshot.completed_sessions).toBe(1);
    expect(snapshot.sessions[0]?.completed).toBe(true);
    expect(snapshot.sessions[0]?.completion_source).toBe(SessionCompletionSource.manual);
  });

  it("tracks derived completion source when session row is derived", () => {
    const structure = extractPlanStructure(planJson);

    const snapshot = computeCompletionSnapshot(
      structure,
      [
        {
          weekNumber: 1,
          sessionNumber: 1,
          activityId: "w1s1a1",
          completedAt: new Date("2026-02-15T00:00:00.000Z")
        },
        {
          weekNumber: 1,
          sessionNumber: 1,
          activityId: "w1s1a2",
          completedAt: new Date("2026-02-15T00:00:00.000Z")
        }
      ],
      [
        {
          weekNumber: 1,
          sessionNumber: 1,
          completedAt: new Date("2026-02-15T00:00:00.000Z"),
          completionSource: SessionCompletionSource.derived_all_activities
        }
      ]
    );

    expect(snapshot.plan_completion_percent).toBe(100);
    expect(snapshot.sessions[0]?.completed).toBe(true);
    expect(snapshot.sessions[0]?.completion_source).toBe(SessionCompletionSource.derived_all_activities);
  });
});
