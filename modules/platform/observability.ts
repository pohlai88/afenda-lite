import { randomUUID } from "node:crypto";

function isNextNavigationError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}

export function logActionEvent(input: {
  correlationId: string;
  action: string;
  userId?: string;
  outcome: "start" | "success" | "error";
  durationMs?: number;
  message?: string;
}) {
  console.log(
    JSON.stringify({
      level: input.outcome === "error" ? "error" : "info",
      correlationId: input.correlationId,
      action: input.action,
      userId: input.userId ?? null,
      outcome: input.outcome,
      durationMs: input.durationMs ?? null,
      message: input.message ?? null,
      ts: new Date().toISOString(),
    }),
  );
}

export async function runLoggedAction<T>(
  action: string,
  userId: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const correlationId = randomUUID();
  const start = Date.now();

  logActionEvent({ correlationId, action, userId, outcome: "start" });

  try {
    const result = await fn();
    logActionEvent({
      correlationId,
      action,
      userId,
      outcome: "success",
      durationMs: Date.now() - start,
    });
    return result;
  } catch (error) {
    if (isNextNavigationError(error)) {
      logActionEvent({
        correlationId,
        action,
        userId,
        outcome: "success",
        durationMs: Date.now() - start,
        message: "navigation",
      });
      throw error;
    }

    logActionEvent({
      correlationId,
      action,
      userId,
      outcome: "error",
      durationMs: Date.now() - start,
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}
