import { describe, expect, it } from "vitest";
import { parseExecutiveSummary } from "@/lib/services/plan-summary";

describe("parseExecutiveSummary", () => {
  it("parses a valid executive summary", () => {
    const parsed = parseExecutiveSummary({
      executive_summary: {
        phase_by_phase_weekly_split: "Weeks 1-3: Base; Weeks 4-6: Build",
        program_snapshot: "Goal: Improve climbing performance. Frequency: 3 sessions/week."
      }
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.phase_by_phase_weekly_split).toContain("Weeks 1-3");
    expect(parsed?.program_snapshot).toContain("Goal:");
  });

  it("returns null when executive summary is missing", () => {
    const parsed = parseExecutiveSummary({
      plan_name: "Legacy plan"
    });
    expect(parsed).toBeNull();
  });

  it("returns null for malformed summary values", () => {
    const parsed = parseExecutiveSummary({
      executive_summary: {
        phase_by_phase_weekly_split: "",
        program_snapshot: "Snapshot text"
      }
    });

    expect(parsed).toBeNull();
  });

  it("accepts multiline text", () => {
    const parsed = parseExecutiveSummary({
      executive_summary: {
        phase_by_phase_weekly_split: "Weeks 1-3: Base\nWeeks 4-6: Build",
        program_snapshot: "Goal: Peak for performance\nConstraint: No campus board"
      }
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.phase_by_phase_weekly_split).toContain("\n");
    expect(parsed?.program_snapshot).toContain("Goal:");
  });
});
