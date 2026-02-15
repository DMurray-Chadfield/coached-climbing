import { z } from "zod";

export const questionnaireSchema = z.object({
  age: z.number().int().min(13).max(100),
  plan_length_weeks: z.number().int().min(1).max(52),
  target_focus: z.object({
    summary: z.string().min(1),
    date: z.string().optional()
  }),
  current_level_summary: z.string().min(1),
  training_history_and_load: z.object({
    recent_training_summary: z.string().min(1)
  }),
  sessions_per_week: z.number().int().min(1).max(14),
  injuries_and_constraints: z.string().min(1),
  notes: z.string().default("")
});

export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;
