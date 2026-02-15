import { Prisma } from "@prisma/client";
import { extractPlanStructure } from "@/lib/services/plan-completion";

type TransactionClient = Prisma.TransactionClient;

type CarryForwardInput = {
  userId: string;
  trainingPlanId: string;
  sourcePlanVersionId: string;
  resultPlanVersionId: string;
  sourcePlanJson: unknown;
  resultPlanJson: unknown;
};

type CarryForwardResult = {
  copiedActivityCompletions: number;
  copiedSessionCompletions: number;
  copiedActivityNotes: number;
  copiedSessionNotes: number;
};

function sessionKey(weekNumber: number, sessionNumber: number): string {
  return `${weekNumber}:${sessionNumber}`;
}

function activityKey(weekNumber: number, sessionNumber: number, activityId: string): string {
  return `${weekNumber}:${sessionNumber}:${activityId}`;
}

export class PlanVersionCarryForwardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanVersionCarryForwardError";
  }
}

function derivePlanKeySets(planJson: unknown): {
  sessionKeys: Set<string>;
  activityKeys: Set<string>;
} {
  const structure = extractPlanStructure(planJson);
  const sessionKeys = new Set<string>();
  const activityKeys = new Set<string>();

  for (const session of structure.sessions) {
    const sKey = sessionKey(session.weekNumber, session.sessionNumber);
    sessionKeys.add(sKey);

    for (const activityId of session.activityIds) {
      activityKeys.add(activityKey(session.weekNumber, session.sessionNumber, activityId));
    }
  }

  return {
    sessionKeys,
    activityKeys
  };
}

export async function carryForwardPlanVersionState(
  tx: TransactionClient,
  input: CarryForwardInput
): Promise<CarryForwardResult> {
  const sourceKeys = derivePlanKeySets(input.sourcePlanJson);
  const resultKeys = derivePlanKeySets(input.resultPlanJson);

  const [sourceActivityCompletions, sourceSessionCompletions, sourceActivityNotes, sourceSessionNotes] =
    await Promise.all([
      tx.activityCompletion.findMany({
        where: {
          userId: input.userId,
          trainingPlanId: input.trainingPlanId,
          planVersionId: input.sourcePlanVersionId,
          completedAt: {
            not: null
          }
        },
        select: {
          weekNumber: true,
          sessionNumber: true,
          activityId: true,
          completedAt: true
        }
      }),
      tx.sessionCompletion.findMany({
        where: {
          userId: input.userId,
          trainingPlanId: input.trainingPlanId,
          planVersionId: input.sourcePlanVersionId,
          completedAt: {
            not: null
          }
        },
        select: {
          weekNumber: true,
          sessionNumber: true,
          completedAt: true,
          completionSource: true
        }
      }),
      tx.activityNote.findMany({
        where: {
          userId: input.userId,
          trainingPlanId: input.trainingPlanId,
          planVersionId: input.sourcePlanVersionId
        },
        select: {
          weekNumber: true,
          sessionNumber: true,
          activityId: true,
          noteText: true
        }
      }),
      tx.sessionNote.findMany({
        where: {
          userId: input.userId,
          trainingPlanId: input.trainingPlanId,
          planVersionId: input.sourcePlanVersionId
        },
        select: {
          weekNumber: true,
          sessionNumber: true,
          noteText: true
        }
      })
    ]);

  const activityCompletionData: Prisma.ActivityCompletionCreateManyInput[] = [];
  const sessionCompletionData: Prisma.SessionCompletionCreateManyInput[] = [];
  const activityNoteData: Prisma.ActivityNoteCreateManyInput[] = [];
  const sessionNoteData: Prisma.SessionNoteCreateManyInput[] = [];

  for (const row of sourceActivityCompletions) {
    const aKey = activityKey(row.weekNumber, row.sessionNumber, row.activityId);

    if (!sourceKeys.activityKeys.has(aKey)) {
      throw new PlanVersionCarryForwardError(
        `Source activity completion does not match source plan structure: ${aKey}`
      );
    }

    if (!resultKeys.activityKeys.has(aKey)) {
      continue;
    }

    activityCompletionData.push({
      userId: input.userId,
      trainingPlanId: input.trainingPlanId,
      planVersionId: input.resultPlanVersionId,
      weekNumber: row.weekNumber,
      sessionNumber: row.sessionNumber,
      activityId: row.activityId,
      completedAt: row.completedAt
    });
  }

  for (const row of sourceSessionCompletions) {
    const sKey = sessionKey(row.weekNumber, row.sessionNumber);

    if (!sourceKeys.sessionKeys.has(sKey)) {
      throw new PlanVersionCarryForwardError(
        `Source session completion does not match source plan structure: ${sKey}`
      );
    }

    if (!resultKeys.sessionKeys.has(sKey)) {
      continue;
    }

    sessionCompletionData.push({
      userId: input.userId,
      trainingPlanId: input.trainingPlanId,
      planVersionId: input.resultPlanVersionId,
      weekNumber: row.weekNumber,
      sessionNumber: row.sessionNumber,
      completedAt: row.completedAt,
      completionSource: row.completionSource
    });
  }

  for (const row of sourceActivityNotes) {
    const aKey = activityKey(row.weekNumber, row.sessionNumber, row.activityId);

    if (!sourceKeys.activityKeys.has(aKey)) {
      throw new PlanVersionCarryForwardError(`Source activity note does not match source plan structure: ${aKey}`);
    }

    if (!resultKeys.activityKeys.has(aKey)) {
      continue;
    }

    activityNoteData.push({
      userId: input.userId,
      trainingPlanId: input.trainingPlanId,
      planVersionId: input.resultPlanVersionId,
      weekNumber: row.weekNumber,
      sessionNumber: row.sessionNumber,
      activityId: row.activityId,
      noteText: row.noteText
    });
  }

  for (const row of sourceSessionNotes) {
    const sKey = sessionKey(row.weekNumber, row.sessionNumber);

    if (!sourceKeys.sessionKeys.has(sKey)) {
      throw new PlanVersionCarryForwardError(`Source session note does not match source plan structure: ${sKey}`);
    }

    if (!resultKeys.sessionKeys.has(sKey)) {
      continue;
    }

    sessionNoteData.push({
      userId: input.userId,
      trainingPlanId: input.trainingPlanId,
      planVersionId: input.resultPlanVersionId,
      weekNumber: row.weekNumber,
      sessionNumber: row.sessionNumber,
      noteText: row.noteText
    });
  }

  const [activityCompletionsInsert, sessionCompletionsInsert, activityNotesInsert, sessionNotesInsert] =
    await Promise.all([
      activityCompletionData.length > 0
        ? tx.activityCompletion.createMany({
            data: activityCompletionData,
            skipDuplicates: true
          })
        : Promise.resolve({ count: 0 }),
      sessionCompletionData.length > 0
        ? tx.sessionCompletion.createMany({
            data: sessionCompletionData,
            skipDuplicates: true
          })
        : Promise.resolve({ count: 0 }),
      activityNoteData.length > 0
        ? tx.activityNote.createMany({
            data: activityNoteData,
            skipDuplicates: true
          })
        : Promise.resolve({ count: 0 }),
      sessionNoteData.length > 0
        ? tx.sessionNote.createMany({
            data: sessionNoteData,
            skipDuplicates: true
          })
        : Promise.resolve({ count: 0 })
    ]);

  return {
    copiedActivityCompletions: activityCompletionsInsert.count,
    copiedSessionCompletions: sessionCompletionsInsert.count,
    copiedActivityNotes: activityNotesInsert.count,
    copiedSessionNotes: sessionNotesInsert.count
  };
}
