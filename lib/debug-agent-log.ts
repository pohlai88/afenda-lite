const DEBUG_ENDPOINT =
  "http://127.0.0.1:7565/ingest/a8faa691-0e06-488f-b48f-0621721eb551";
const DEBUG_SESSION_ID = "3320af";

export function debugAgentLog(input: {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
}) {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      location: input.location,
      message: input.message,
      data: input.data ?? {},
      hypothesisId: input.hypothesisId,
      runId: input.runId ?? "pre-fix",
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
