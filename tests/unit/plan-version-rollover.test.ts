import { describe, expect, it, vi } from "vitest";
import {
  carryForwardPlanVersionState,
  PlanVersionCarryForwardError
} from "@/lib/services/plan-version-rollover";

function buildPlan(activityIds: string[]) {
  return {
    plan_name: "Plan",
    start_date: "2026-02-15",
    weeks: [
      {
        week_number: 1,
        focus: "Base",
        sessions: [
          {
            session_number: 1,
            session_type: "Climbing",
            description: "Session",
            activities: activityIds.map((id) => ({
              activity_id: id,
              name: id,
              description: id
            }))
          }
        ]
      }
    ]
  };
}

describe("plan-version-rollover service", () => {
  it("copies matching completion and note state to the new version", async () => {
    const tx = {
      activityCompletion: {
        findMany: vi.fn().mockResolvedValue([
          {
            weekNumber: 1,
            sessionNumber: 1,
            activityId: "a1",
            completedAt: new Date("2026-02-15T00:00:00.000Z")
          }
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      sessionCompletion: {
        findMany: vi.fn().mockResolvedValue([
          {
            weekNumber: 1,
            sessionNumber: 1,
            completedAt: new Date("2026-02-15T00:00:00.000Z"),
            completionSource: "manual"
          }
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      sessionNote: {
        findMany: vi.fn().mockResolvedValue([
          {
            weekNumber: 1,
            sessionNumber: 1,
            noteText: "Session note"
          }
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 1 })
      }
    };

    const result = await carryForwardPlanVersionState(tx as never, {
      userId: "user_1",
      trainingPlanId: "plan_1",
      sourcePlanVersionId: "version_1",
      resultPlanVersionId: "version_2",
      sourcePlanJson: buildPlan(["a1"]),
      resultPlanJson: buildPlan(["a1", "a2"])
    });

    expect(result).toEqual({
      copiedActivityCompletions: 1,
      copiedSessionCompletions: 1,
      copiedSessionNotes: 1
    });
    expect(tx.activityCompletion.createMany).toHaveBeenCalledTimes(1);
    expect(tx.sessionCompletion.createMany).toHaveBeenCalledTimes(1);
    expect(tx.sessionNote.createMany).toHaveBeenCalledTimes(1);
  });

  it("skips rows that do not exist in the result version", async () => {
    const tx = {
      activityCompletion: {
        findMany: vi.fn().mockResolvedValue([
          {
            weekNumber: 1,
            sessionNumber: 1,
            activityId: "a1",
            completedAt: new Date("2026-02-15T00:00:00.000Z")
          }
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      sessionCompletion: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      sessionNote: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 0 })
      }
    };

    const result = await carryForwardPlanVersionState(tx as never, {
      userId: "user_1",
      trainingPlanId: "plan_1",
      sourcePlanVersionId: "version_1",
      resultPlanVersionId: "version_2",
      sourcePlanJson: buildPlan(["a1"]),
      resultPlanJson: buildPlan(["a2"])
    });

    expect(result).toEqual({
      copiedActivityCompletions: 0,
      copiedSessionCompletions: 0,
      copiedSessionNotes: 0
    });
    expect(tx.activityCompletion.createMany).not.toHaveBeenCalled();
  });

  it("throws on source rows that do not match source plan structure", async () => {
    const tx = {
      activityCompletion: {
        findMany: vi.fn().mockResolvedValue([
          {
            weekNumber: 1,
            sessionNumber: 1,
            activityId: "missing",
            completedAt: new Date("2026-02-15T00:00:00.000Z")
          }
        ]),
        createMany: vi.fn()
      },
      sessionCompletion: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn()
      },
      sessionNote: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn()
      }
    };

    await expect(
      carryForwardPlanVersionState(tx as never, {
        userId: "user_1",
        trainingPlanId: "plan_1",
        sourcePlanVersionId: "version_1",
        resultPlanVersionId: "version_2",
        sourcePlanJson: buildPlan(["a1"]),
        resultPlanJson: buildPlan(["a1"])
      })
    ).rejects.toBeInstanceOf(PlanVersionCarryForwardError);
  });
});
