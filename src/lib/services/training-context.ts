import { readFile } from "node:fs/promises";
import path from "node:path";

export type PlanDiscipline = "bouldering" | "sport_trad";

export function normalizePlanDiscipline(value: unknown): PlanDiscipline | null {
  if (value === "bouldering" || value === "sport_trad") {
    return value;
  }

  return null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function inferFromPlanJson(planJson: Record<string, unknown>): PlanDiscipline | null {
  const textBits: string[] = [];
  const weeks = Array.isArray(planJson.weeks) ? planJson.weeks : [];

  for (const week of weeks) {
    if (typeof week === "object" && week !== null && !Array.isArray(week)) {
      const record = week as Record<string, unknown>;
      textBits.push(asText(record.focus));

      const sessions = Array.isArray(record.sessions) ? record.sessions : [];
      for (const session of sessions) {
        if (typeof session === "object" && session !== null && !Array.isArray(session)) {
          const sessionRecord = session as Record<string, unknown>;
          textBits.push(asText(sessionRecord.session_type));
          textBits.push(asText(sessionRecord.description));
        }
      }
    }
  }

  const haystack = textBits.join(" ");
  if (haystack.includes("boulder")) {
    return "bouldering";
  }
  if (haystack.includes("sport") || haystack.includes("route") || haystack.includes("trad")) {
    return "sport_trad";
  }

  return null;
}

export function resolvePlanDiscipline(input: {
  explicitDiscipline?: unknown;
  onboarding?: Record<string, unknown> | null;
  planJson?: Record<string, unknown> | null;
  fallback?: PlanDiscipline;
}): PlanDiscipline {
  const explicit = normalizePlanDiscipline(input.explicitDiscipline);
  if (explicit) {
    return explicit;
  }

  const onboardingDiscipline = normalizePlanDiscipline(input.onboarding?.plan_discipline);
  if (onboardingDiscipline) {
    return onboardingDiscipline;
  }

  if (input.planJson) {
    const inferred = inferFromPlanJson(input.planJson);
    if (inferred) {
      return inferred;
    }
  }

  return input.fallback ?? "sport_trad";
}

export async function loadTrainingContext(discipline: PlanDiscipline): Promise<string> {
  const fileName =
    discipline === "bouldering" ? "training-ideas-bouldering.md" : "training-ideas-sport-trad.md";
  const contextPath = path.join(process.cwd(), "training info", fileName);
  return readFile(contextPath, "utf8");
}
