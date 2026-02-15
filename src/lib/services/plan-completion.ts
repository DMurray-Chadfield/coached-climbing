import { Prisma, SessionCompletionSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CompletionClient = Prisma.TransactionClient | typeof prisma;

type PlanSession = {
  weekNumber: number;
  sessionNumber: number;
  activityIds: string[];
};

type PlanStructure = {
  sessions: PlanSession[];
  sessionMap: Map<string, PlanSession>;
};

type SnapshotSession = {
  week_number: number;
  session_number: number;
  completed: boolean;
  completion_source: SessionCompletionSource | null;
  completion_percent: number;
};

type SnapshotActivity = {
  week_number: number;
  session_number: number;
  activity_id: string;
  completed: boolean;
};

export type CompletionSnapshotSession = SnapshotSession;
export type CompletionSnapshotActivity = SnapshotActivity;

export type CompletionSnapshot = {
  plan_completion_percent: number;
  completed_sessions: number;
  total_sessions: number;
  completed_activities: number;
  total_activities: number;
  sessions: SnapshotSession[];
  activities: SnapshotActivity[];
};

type ToggleActivityInput = {
  userId: string;
  trainingPlanId: string;
  planVersionId: string;
  weekNumber: number;
  sessionNumber: number;
  activityId: string;
  completed: boolean;
  planJson: unknown;
};

type ToggleSessionInput = {
  userId: string;
  trainingPlanId: string;
  planVersionId: string;
  weekNumber: number;
  sessionNumber: number;
  completed: boolean;
  planJson: unknown;
};

type SnapshotInput = {
  userId: string;
  trainingPlanId: string;
  planVersionId: string;
  planJson: unknown;
};

function sessionKey(weekNumber: number, sessionNumber: number): string {
  return `${weekNumber}:${sessionNumber}`;
}

function activityKey(weekNumber: number, sessionNumber: number, activityId: string): string {
  return `${weekNumber}:${sessionNumber}:${activityId}`;
}

function asPositiveInt(value: unknown): number | null {
  if (!Number.isInteger(value)) {
    return null;
  }

  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractPlanStructure(planJson: unknown): PlanStructure {
  if (!isRecord(planJson) || !Array.isArray(planJson.weeks)) {
    throw new Error("INVALID_PLAN_JSON");
  }

  const sessions: PlanSession[] = [];
  const sessionMap = new Map<string, PlanSession>();

  for (const week of planJson.weeks) {
    if (!isRecord(week) || !Array.isArray(week.sessions)) {
      throw new Error("INVALID_PLAN_JSON");
    }

    const weekNumber = asPositiveInt(week.week_number);
    if (!weekNumber) {
      throw new Error("INVALID_PLAN_JSON");
    }

    for (const session of week.sessions) {
      if (!isRecord(session) || !Array.isArray(session.activities)) {
        throw new Error("INVALID_PLAN_JSON");
      }

      const sessionNumber = asPositiveInt(session.session_number);
      if (!sessionNumber) {
        throw new Error("INVALID_PLAN_JSON");
      }

      const ids: string[] = [];

      for (const activity of session.activities) {
        if (!isRecord(activity) || typeof activity.activity_id !== "string" || activity.activity_id.length === 0) {
          throw new Error("INVALID_PLAN_JSON");
        }

        ids.push(activity.activity_id);
      }

      if (ids.length === 0) {
        throw new Error("INVALID_PLAN_JSON");
      }

      const entry: PlanSession = {
        weekNumber,
        sessionNumber,
        activityIds: ids
      };

      sessions.push(entry);
      sessionMap.set(sessionKey(weekNumber, sessionNumber), entry);
    }
  }

  if (sessions.length === 0) {
    throw new Error("INVALID_PLAN_JSON");
  }

  return {
    sessions,
    sessionMap
  };
}

function calculatePercent(completed: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

export function computeCompletionSnapshot(
  structure: PlanStructure,
  activityRows: Array<{
    weekNumber: number;
    sessionNumber: number;
    activityId: string;
    completedAt: Date | null;
  }>,
  sessionRows: Array<{
    weekNumber: number;
    sessionNumber: number;
    completedAt: Date | null;
    completionSource: SessionCompletionSource;
  }>
): CompletionSnapshot {
  const completedActivitySet = new Set<string>();

  for (const row of activityRows) {
    if (row.completedAt) {
      completedActivitySet.add(activityKey(row.weekNumber, row.sessionNumber, row.activityId));
    }
  }

  const completedSessionMap = new Map<
    string,
    {
      source: SessionCompletionSource;
    }
  >();

  for (const row of sessionRows) {
    if (row.completedAt) {
      completedSessionMap.set(sessionKey(row.weekNumber, row.sessionNumber), {
        source: row.completionSource
      });
    }
  }

  let completedActivities = 0;
  let totalActivities = 0;
  let completedSessions = 0;

  const sessions: SnapshotSession[] = [];
  const activities: SnapshotActivity[] = [];

  for (const session of structure.sessions) {
    let completedInSession = 0;

    for (const activityId of session.activityIds) {
      const completed = completedActivitySet.has(activityKey(session.weekNumber, session.sessionNumber, activityId));
      totalActivities += 1;

      if (completed) {
        completedActivities += 1;
        completedInSession += 1;
      }

      activities.push({
        week_number: session.weekNumber,
        session_number: session.sessionNumber,
        activity_id: activityId,
        completed
      });
    }

    const completedSession = completedSessionMap.get(sessionKey(session.weekNumber, session.sessionNumber));
    const completed = Boolean(completedSession);

    if (completed) {
      completedSessions += 1;
    }

    sessions.push({
      week_number: session.weekNumber,
      session_number: session.sessionNumber,
      completed,
      completion_source: completed ? completedSession?.source ?? null : null,
      completion_percent: calculatePercent(completedInSession, session.activityIds.length)
    });
  }

  return {
    plan_completion_percent: calculatePercent(completedActivities, totalActivities),
    completed_sessions: completedSessions,
    total_sessions: structure.sessions.length,
    completed_activities: completedActivities,
    total_activities: totalActivities,
    sessions,
    activities
  };
}

function assertSessionExists(structure: PlanStructure, weekNumber: number, sessionNumber: number): PlanSession {
  const session = structure.sessionMap.get(sessionKey(weekNumber, sessionNumber));

  if (!session) {
    throw new Error("INVALID_SESSION");
  }

  return session;
}

function assertActivityExists(session: PlanSession, activityId: string): void {
  if (!session.activityIds.includes(activityId)) {
    throw new Error("INVALID_ACTIVITY");
  }
}

async function fetchSnapshot(
  client: CompletionClient,
  input: {
    userId: string;
    trainingPlanId: string;
    planVersionId: string;
    structure: PlanStructure;
  }
): Promise<CompletionSnapshot> {
  const [activityRows, sessionRows] = await Promise.all([
    client.activityCompletion.findMany({
      where: {
        userId: input.userId,
        trainingPlanId: input.trainingPlanId,
        planVersionId: input.planVersionId
      },
      select: {
        weekNumber: true,
        sessionNumber: true,
        activityId: true,
        completedAt: true
      }
    }),
    client.sessionCompletion.findMany({
      where: {
        userId: input.userId,
        trainingPlanId: input.trainingPlanId,
        planVersionId: input.planVersionId
      },
      select: {
        weekNumber: true,
        sessionNumber: true,
        completedAt: true,
        completionSource: true
      }
    })
  ]);

  return computeCompletionSnapshot(input.structure, activityRows, sessionRows);
}

async function applyDerivedSessionCompletion(
  client: CompletionClient,
  input: {
    userId: string;
    trainingPlanId: string;
    planVersionId: string;
    session: PlanSession;
  }
): Promise<void> {
  const completedActivities = await client.activityCompletion.count({
    where: {
      userId: input.userId,
      trainingPlanId: input.trainingPlanId,
      planVersionId: input.planVersionId,
      weekNumber: input.session.weekNumber,
      sessionNumber: input.session.sessionNumber,
      activityId: {
        in: input.session.activityIds
      },
      completedAt: {
        not: null
      }
    }
  });

  const allActivitiesComplete = completedActivities === input.session.activityIds.length;

  if (allActivitiesComplete) {
    await client.sessionCompletion.upsert({
      where: {
        userId_planVersionId_weekNumber_sessionNumber: {
          userId: input.userId,
          planVersionId: input.planVersionId,
          weekNumber: input.session.weekNumber,
          sessionNumber: input.session.sessionNumber
        }
      },
      create: {
        userId: input.userId,
        trainingPlanId: input.trainingPlanId,
        planVersionId: input.planVersionId,
        weekNumber: input.session.weekNumber,
        sessionNumber: input.session.sessionNumber,
        completedAt: new Date(),
        completionSource: SessionCompletionSource.derived_all_activities
      },
      update: {
        completedAt: new Date(),
        completionSource: SessionCompletionSource.derived_all_activities
      }
    });

    return;
  }

  const existing = await client.sessionCompletion.findUnique({
    where: {
      userId_planVersionId_weekNumber_sessionNumber: {
        userId: input.userId,
        planVersionId: input.planVersionId,
        weekNumber: input.session.weekNumber,
        sessionNumber: input.session.sessionNumber
      }
    },
    select: {
      id: true,
      completionSource: true
    }
  });

  if (existing?.completionSource === SessionCompletionSource.derived_all_activities) {
    await client.sessionCompletion.delete({
      where: {
        id: existing.id
      }
    });
  }
}

export async function getCompletionSnapshot(input: SnapshotInput): Promise<CompletionSnapshot> {
  const structure = extractPlanStructure(input.planJson);

  return fetchSnapshot(prisma, {
    userId: input.userId,
    trainingPlanId: input.trainingPlanId,
    planVersionId: input.planVersionId,
    structure
  });
}

export async function toggleActivityCompletion(input: ToggleActivityInput): Promise<CompletionSnapshot> {
  const structure = extractPlanStructure(input.planJson);
  const session = assertSessionExists(structure, input.weekNumber, input.sessionNumber);
  assertActivityExists(session, input.activityId);

  return prisma.$transaction(async (tx) => {
    await tx.activityCompletion.upsert({
      where: {
        userId_planVersionId_weekNumber_sessionNumber_activityId: {
          userId: input.userId,
          planVersionId: input.planVersionId,
          weekNumber: input.weekNumber,
          sessionNumber: input.sessionNumber,
          activityId: input.activityId
        }
      },
      create: {
        userId: input.userId,
        trainingPlanId: input.trainingPlanId,
        planVersionId: input.planVersionId,
        weekNumber: input.weekNumber,
        sessionNumber: input.sessionNumber,
        activityId: input.activityId,
        completedAt: input.completed ? new Date() : null
      },
      update: {
        completedAt: input.completed ? new Date() : null
      }
    });

    await applyDerivedSessionCompletion(tx, {
      userId: input.userId,
      trainingPlanId: input.trainingPlanId,
      planVersionId: input.planVersionId,
      session
    });

    return fetchSnapshot(tx, {
      userId: input.userId,
      trainingPlanId: input.trainingPlanId,
      planVersionId: input.planVersionId,
      structure
    });
  });
}

export async function toggleSessionCompletion(input: ToggleSessionInput): Promise<CompletionSnapshot> {
  const structure = extractPlanStructure(input.planJson);
  const session = assertSessionExists(structure, input.weekNumber, input.sessionNumber);

  return prisma.$transaction(async (tx) => {
    if (input.completed) {
      await Promise.all(
        session.activityIds.map((activityId) =>
          tx.activityCompletion.upsert({
            where: {
              userId_planVersionId_weekNumber_sessionNumber_activityId: {
                userId: input.userId,
                planVersionId: input.planVersionId,
                weekNumber: input.weekNumber,
                sessionNumber: input.sessionNumber,
                activityId
              }
            },
            create: {
              userId: input.userId,
              trainingPlanId: input.trainingPlanId,
              planVersionId: input.planVersionId,
              weekNumber: input.weekNumber,
              sessionNumber: input.sessionNumber,
              activityId,
              completedAt: new Date()
            },
            update: {
              completedAt: new Date()
            }
          })
        )
      );
    } else {
      await tx.activityCompletion.updateMany({
        where: {
          userId: input.userId,
          trainingPlanId: input.trainingPlanId,
          planVersionId: input.planVersionId,
          weekNumber: input.weekNumber,
          sessionNumber: input.sessionNumber,
          activityId: {
            in: session.activityIds
          }
        },
        data: {
          completedAt: null
        }
      });
    }

    await tx.sessionCompletion.upsert({
      where: {
        userId_planVersionId_weekNumber_sessionNumber: {
          userId: input.userId,
          planVersionId: input.planVersionId,
          weekNumber: input.weekNumber,
          sessionNumber: input.sessionNumber
        }
      },
      create: {
        userId: input.userId,
        trainingPlanId: input.trainingPlanId,
        planVersionId: input.planVersionId,
        weekNumber: input.weekNumber,
        sessionNumber: input.sessionNumber,
        completedAt: input.completed ? new Date() : null,
        completionSource: SessionCompletionSource.manual
      },
      update: {
        completedAt: input.completed ? new Date() : null,
        completionSource: SessionCompletionSource.manual
      }
    });

    await applyDerivedSessionCompletion(tx, {
      userId: input.userId,
      trainingPlanId: input.trainingPlanId,
      planVersionId: input.planVersionId,
      session
    });

    return fetchSnapshot(tx, {
      userId: input.userId,
      trainingPlanId: input.trainingPlanId,
      planVersionId: input.planVersionId,
      structure
    });
  });
}
