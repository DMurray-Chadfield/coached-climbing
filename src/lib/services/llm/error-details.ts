function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function sanitize(value: unknown, depth = 0): unknown {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (depth >= 4) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message
    };
  }

  if (isRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = sanitize(entry, depth + 1);
    }
    return output;
  }

  return String(value);
}

export function normalizeLlmError(error: unknown, unknownMessage: string): Record<string, unknown> {
  if (!isRecord(error)) {
    return { message: unknownMessage };
  }

  const details = isRecord(error.details) ? error.details : undefined;
  const nestedError = isRecord(error.error) ? error.error : undefined;
  const cause = error.cause;

  const message =
    asString(error.message) ??
    asString(details?.message) ??
    asString(nestedError?.message) ??
    unknownMessage;
  const status = asNumber(error.status) ?? asNumber(details?.status) ?? asNumber(nestedError?.status);
  const code = asString(error.code) ?? asString(details?.code) ?? asString(nestedError?.code);
  const type = asString(error.type) ?? asString(details?.type) ?? asString(nestedError?.type);
  const provider = asString(error.provider) ?? asString(details?.provider);

  const normalized: Record<string, unknown> = {
    name: asString(error.name),
    message,
    status,
    code,
    type
  };

  if (provider) {
    normalized.provider = provider;
  }

  if (details) {
    normalized.details = sanitize(details);
  }

  if (cause !== undefined) {
    normalized.cause = sanitize(cause);
  }

  return normalized;
}
