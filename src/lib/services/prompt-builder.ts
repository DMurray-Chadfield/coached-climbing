import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { QuestionnaireInput } from "@/lib/schemas/questionnaire";

const SAFETY_CONSTRAINTS = [
  "Never produce impossible or unsafe training loads.",
  "Respect injuries and constraints exactly.",
  "Output must match JSON schema exactly.",
  "Use session_number based plans; do not assume weekdays.",
  "Keep volumes realistic for the user profile."
].join(" ");

export function buildGenerationMessages(params: {
  trainingContext: string;
  questionnaire: QuestionnaireInput;
  correctionFeedback?: string;
}): ChatCompletionMessageParam[] {
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
          questionnaire: params.questionnaire
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
