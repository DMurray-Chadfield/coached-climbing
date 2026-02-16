export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmMode =
  | {
      kind: "text";
    }
  | {
      kind: "json";
      schemaName: string;
      schema: Record<string, unknown>;
    };

