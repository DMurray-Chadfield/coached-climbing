import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { QuestionnaireInput } from "@/lib/schemas/questionnaire";

const SAFETY_CONSTRAINTS = [
  "Never produce impossible or unsafe training loads.",
  "Respect injuries and constraints exactly.",
  "Output must match JSON schema exactly.",
  "Use session_number based plans; do not assume weekdays.",
  "Keep volumes realistic for the user profile.",
  "If an activity prescribes sets and reps, include clear rest timing (between reps/sets/rounds as applicable).",
  "When a session includes both 4x4s and sustained route-sim work, schedule 4x4s before sustained route-sim sets.",
  "When a session includes both hangboarding and climbing, schedule hangboarding before climbing."
].join(" ");

export function buildGenerationMessages(params: {
  trainingContext: string;
  questionnaire: QuestionnaireInput;
  correctionFeedback?: string;
}): ChatCompletionMessageParam[] {
  const { age, ...questionnaireWithoutAge } = params.questionnaire;
  const promptQuestionnaire = {
    ...questionnaireWithoutAge,
    climbing_age_years: age
  };

  const baseMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: params.trainingContext
    },
    {
      role: "system",
      content: SAFETY_CONSTRAINTS
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "Generate a personalized climbing training plan.",
          questionnaire: promptQuestionnaire
        },
        null,
        2
      )
    }
  ];

  if (!params.correctionFeedback) {
    return baseMessages;
  }

  return [
    ...baseMessages,
    {
      role: "user",
      content: `The previous output failed schema validation. Fix it exactly:\n${params.correctionFeedback}`
    }
  ];
}
