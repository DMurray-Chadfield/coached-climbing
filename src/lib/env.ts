import { z } from "zod";

const CommonEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16)
});

const OpenAiEnvSchema = CommonEnvSchema.extend({
  LLM_PROVIDER: z.literal("openai").default("openai"),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL_PRIMARY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL_PRIMARY: z.string().min(1).optional()
});

const GeminiEnvSchema = CommonEnvSchema.extend({
  LLM_PROVIDER: z.literal("gemini"),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL_PRIMARY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL_PRIMARY: z.string().min(1).optional()
});

const EnvSchema = z.union([OpenAiEnvSchema, GeminiEnvSchema]);

export type AppEnv = z.infer<typeof EnvSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = EnvSchema.parse(process.env);
  return cachedEnv;
}

export function resetEnvCacheForTests(): void {
  cachedEnv = null;
}
