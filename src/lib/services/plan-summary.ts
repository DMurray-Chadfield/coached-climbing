export type ExecutiveSummary = {
  phase_by_phase_weekly_split: string;
  program_snapshot: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseExecutiveSummary(planJson: Record<string, unknown>): ExecutiveSummary | null {
  const raw = planJson.executive_summary;
  if (!isRecord(raw)) {
    return null;
  }

  const phase_by_phase_weekly_split = asNonEmptyString(raw.phase_by_phase_weekly_split);
  const program_snapshot = asNonEmptyString(raw.program_snapshot);

  if (!phase_by_phase_weekly_split || !program_snapshot) {
    return null;
  }

  return {
    phase_by_phase_weekly_split,
    program_snapshot
  };
}
