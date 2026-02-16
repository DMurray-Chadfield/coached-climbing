import { describe, expect, it } from "vitest";
import { getEnv, resetEnvCacheForTests } from "@/lib/env";

describe("getEnv", () => {
  it("parses required environment variables", () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.NEXTAUTH_SECRET = "super-secret-for-tests";
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL_PRIMARY = "gpt-5-mini";

    resetEnvCacheForTests();

    const env = getEnv();
    expect(env.OPENAI_MODEL_PRIMARY).toBe("gpt-5-mini");
  });

  it("requires Gemini env vars when LLM_PROVIDER is gemini", () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/test";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.NEXTAUTH_SECRET = "super-secret-for-tests";
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL_PRIMARY = "gemini-2.5-pro";

    resetEnvCacheForTests();

    const env = getEnv();
    expect(env.LLM_PROVIDER).toBe("gemini");
    expect(env.GEMINI_MODEL_PRIMARY).toBe("gemini-2.5-pro");
  });
});
