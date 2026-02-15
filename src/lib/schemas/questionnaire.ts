import { z } from "zod";

export const questionnaireSchema = z.object({
  age: z.number().int().min(13).max(100),
  sex: z.string().min(1),
  plan_length_weeks: z.number().int().min(1).max(52),
  target_event: z
    .object({
      type: z.string().min(1),
      date: z.string().optional(),
      details: z.string().optional()
    })
    .optional(),
  current_level: z.object({
    boulder_grade: z.string().optional(),
    route_grade: z.string().optional(),
    context_notes: z.string().optional()
  }),
  goals: z.array(z.string().min(1)).min(1),
  training_history_and_load: z.object({
    recent_training_summary: z.string().min(1),
    past_exercises: z.array(z.string()).default([]),
    load_tolerance: z.string().min(1)
  }),
  sessions_per_week: z.number().int().min(1).max(14),
  injuries_and_constraints: z.string().min(1),
  notes: z.string().default("")
});

export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;
