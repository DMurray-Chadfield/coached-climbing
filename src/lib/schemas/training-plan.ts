import Ajv, { type ErrorObject } from "ajv";

const executiveSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["phase_by_phase_weekly_split", "program_snapshot"],
  properties: {
    phase_by_phase_weekly_split: { type: "string", minLength: 1 },
    program_snapshot: { type: "string", minLength: 1 }
  }
} as const;

export const trainingPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["plan_name", "start_date", "executive_summary", "weeks"],
  properties: {
    plan_name: { type: "string", minLength: 1 },
    start_date: { type: "string", minLength: 1 },
    executive_summary: executiveSummarySchema,
    weeks: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["week_number", "focus", "sessions"],
        properties: {
          week_number: { type: "integer", minimum: 1 },
          focus: { type: "string", minLength: 1 },
          sessions: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "session_number",
                "session_type",
                "description",
                "estimated_minutes",
                "activities"
              ],
              properties: {
                session_number: { type: "integer", minimum: 1 },
                session_type: { type: "string", minLength: 1 },
                description: { type: "string", minLength: 1 },
                estimated_minutes: { type: "integer", minimum: 1 },
                activities: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "activity_id",
                      "name",
                      "description",
                      "duration_minutes",
                      "completion_criteria",
                      "intensity"
                    ],
                    properties: {
                      activity_id: { type: "string", minLength: 1 },
                      name: { type: "string", minLength: 1 },
                      description: { type: "string", minLength: 1 },
                      duration_minutes: { type: ["integer", "null"], minimum: 1 },
                      completion_criteria: { type: ["string", "null"], minLength: 1 },
                      intensity: { type: ["string", "null"] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
} as const;

const ajv = new Ajv({ allErrors: true, strict: false });
const validator = ajv.compile(trainingPlanJsonSchema);

export function validateTrainingPlan(value: unknown): {
  valid: boolean;
  errors: ErrorObject[];
} {
  const valid = validator(value);
  return {
    valid: Boolean(valid),
    errors: (validator.errors ?? []) as ErrorObject[]
  };
}
