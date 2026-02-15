import { prisma } from "@/lib/prisma";
import { extractPlanStructure } from "@/lib/services/plan-completion";

export type NotesSnapshot = {
  sessions: Array<{
    week_number: number;
    session_number: number;
    note_text: string;
  }>;
  activities: Array<{
    week_number: number;
    session_number: number;
    activity_id: string;
    note_text: string;
  }>;
};

type GetNotesSnapshotInput = {
  userId: string;
  trainingPlanId: string;
  planVersionId: string;
};

type SetSessionNoteInput = GetNotesSnapshotInput & {
  weekNumber: number;
  sessionNumber: number;
  noteText: string;
  planJson: unknown;
};

function sessionKey(weekNumber: number, sessionNumber: number): string {
  return `${weekNumber}:${sessionNumber}`;
}

function assertSessionAndActivity(input: {
  planJson: unknown;
  weekNumber: number;
  sessionNumber: number;
  activityId?: string;
}): void {
  const structure = extractPlanStructure(input.planJson);
  const session = structure.sessionMap.get(sessionKey(input.weekNumber, input.sessionNumber));

  if (!session) {
    throw new Error("INVALID_SESSION");
  }

  if (input.activityId && !session.activityIds.includes(input.activityId)) {
    throw new Error("INVALID_ACTIVITY");
  }
}

export async function getNotesSnapshot(input: GetNotesSnapshotInput): Promise<NotesSnapshot> {
  const sessionNotes = await prisma.sessionNote.findMany({
    where: {
      userId: input.userId,
      trainingPlanId: input.trainingPlanId,
      planVersionId: input.planVersionId
    },
    select: {
      weekNumber: true,
      sessionNumber: true,
      noteText: true
    }
  });

  return {
    sessions: sessionNotes.map((note) => ({
      week_number: note.weekNumber,
      session_number: note.sessionNumber,
      note_text: note.noteText
    })),
    activities: []
  };
}

export async function setSessionNote(input: SetSessionNoteInput): Promise<NotesSnapshot> {
  assertSessionAndActivity({
    planJson: input.planJson,
    weekNumber: input.weekNumber,
    sessionNumber: input.sessionNumber
  });

  const text = input.noteText.trim();

  if (text.length === 0) {
    await prisma.sessionNote.deleteMany({
      where: {
        userId: input.userId,
        trainingPlanId: input.trainingPlanId,
        planVersionId: input.planVersionId,
        weekNumber: input.weekNumber,
        sessionNumber: input.sessionNumber
      }
    });
  } else {
    await prisma.sessionNote.upsert({
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
        noteText: text
      },
      update: {
        noteText: text
      }
    });
  }

  return getNotesSnapshot(input);
}
