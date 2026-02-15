import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue("TRAINING_CONTEXT")
}));

vi.mock("openai", () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: createMock
        }
      };
    }
  };
});

describe("generateTrainingPlan", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.NEXTAUTH_SECRET = "super-secret-for-tests";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL_PRIMARY = "gpt-4.1";

    const envModule = await import("@/lib/env");
    envModule.resetEnvCacheForTests();
  });

  it("retries once when the first model response fails schema validation", async () => {
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                plan_name: "Bad Plan"
              })
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                plan_name: "Valid Plan",
                start_date: "2026-03-01",
                weeks: [
                  {
                    week_number: 1,
                    focus: "Technique",
                    sessions: [
                      {
                        session_number: 1,
                        session_type: "Climbing",
                        description: "Quality practice",
                        estimated_minutes: 90,
                        activities: [
                          {
                            activity_id: "w1s1a1",
                            name: "Warmup",
                            description: "Easy movement",
                            duration_minutes: 20
                          }
                        ]
                      }
                    ]
                  }
                ]
              })
            }
          }
        ]
      });

    const { generateTrainingPlan } = await import("@/lib/services/plan-generator");

    const result = await generateTrainingPlan({
      age: 29,
      sex: "Male",
      plan_length_weeks: 12,
      current_level: {},
      goals: ["Improve technique"],
      training_history_and_load: {
        recent_training_summary: "Some training",
        past_exercises: [],
        load_tolerance: "Moderate"
      },
      sessions_per_week: 3,
      injuries_and_constraints: "None",
      notes: ""
    });

    expect(result.retryCount).toBe(1);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
