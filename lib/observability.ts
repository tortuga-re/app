import "server-only";

type ObservabilityLevel = "info" | "warn" | "error";

type ObservabilityPayload = Record<string, unknown>;

const sanitizePayload = (payload: ObservabilityPayload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

export const logServerEvent = (
  level: ObservabilityLevel,
  event: string,
  payload: ObservabilityPayload = {},
) => {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitizePayload(payload),
  };
  const message = JSON.stringify(entry);

  if (level === "error") {
    console.error(message);
    return;
  }

  if (level === "warn") {
    console.warn(message);
    return;
  }

  console.info(message);
};

export const measureServerOperation = async <T>(
  event: string,
  operation: () => Promise<T>,
  payload: ObservabilityPayload = {},
): Promise<T> => {
  const startedAt = Date.now();

  try {
    const result = await operation();
    logServerEvent("info", event, {
      ...payload,
      outcome: "success",
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logServerEvent("error", event, {
      ...payload,
      outcome: "error",
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : String(error),
    });
    throw error;
  }
};
