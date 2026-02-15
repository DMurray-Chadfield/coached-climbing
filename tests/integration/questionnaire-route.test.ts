import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-guard", () => ({
  requireUserId: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    questionnaireResponse: {
      create: vi.fn(),
      findFirst: vi.fn()
    }
  }
}));

import { requireUserId } from "@/lib/server/auth-guard";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/questionnaire/route";

describe("questionnaire route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("saves a valid questionnaire", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.questionnaireResponse.create).mockResolvedValue({
      id: "q_1",
      createdAt: new Date("2026-02-15T00:00:00.000Z")
    } as never);

    const response = await POST(
      new Request("http://localhost/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        })
      })
    );

    expect(response.status).toBe(201);
    expect(prisma.questionnaireResponse.create).toHaveBeenCalledTimes(1);
  });
});
