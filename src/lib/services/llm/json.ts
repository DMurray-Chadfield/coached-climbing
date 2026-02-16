function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

function extractJsonObjectSubstring(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

export function parseJsonLenient(
  text: string
): { ok: true; value: unknown } | { ok: false; error: string; snippet: string } {
  const cleaned = stripCodeFences(text);

  try {
    return { ok: true, value: JSON.parse(cleaned) };
  } catch (error) {
    const extracted = extractJsonObjectSubstring(cleaned);
    if (extracted) {
      try {
        return { ok: true, value: JSON.parse(extracted) };
      } catch {
        // fall through to error response
      }
    }

    const snippet = cleaned.length > 4000 ? `${cleaned.slice(0, 4000)}…` : cleaned;
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown JSON parse error",
      snippet
    };
  }
}

