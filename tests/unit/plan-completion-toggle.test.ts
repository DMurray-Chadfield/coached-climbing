import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  activityCompletion: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn()
  },
  sessionCompletion: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn()
  }
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
  }
}));

import { prisma } from "@/lib/prisma";
import { toggleSessionCompletion } from "@/lib/services/plan-completion";

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

describe("toggleSessionCompletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.activityCompletion.findMany.mockResolvedValue([]);
    tx.sessionCompletion.findMany.mockResolvedValue([]);
    tx.sessionCompletion.findUnique.mockResolvedValue(null);
  });

  it("marks all session activities complete when session is checked", async () => {
    tx.activityCompletion.count.mockResolvedValue(2);

    await toggleSessionCompletion({
      userId: "user_1",
      trainingPlanId: "plan_1",
      planVersionId: "version_1",
      weekNumber: 1,
      sessionNumber: 1,
      completed: true,
      planJson
    });

    expect(tx.activityCompletion.upsert).toHaveBeenCalledTimes(2);
    expect(tx.activityCompletion.updateMany).not.toHaveBeenCalled();
    expect(tx.sessionCompletion.upsert).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("clears all session activities when session is unchecked", async () => {
    tx.activityCompletion.count.mockResolvedValue(0);

    await toggleSessionCompletion({
      userId: "user_1",
      trainingPlanId: "plan_1",
      planVersionId: "version_1",
      weekNumber: 1,
      sessionNumber: 1,
      completed: false,
      planJson
    });

    expect(tx.activityCompletion.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.activityCompletion.upsert).not.toHaveBeenCalled();
    expect(tx.sessionCompletion.upsert).toHaveBeenCalled();
  });
});
