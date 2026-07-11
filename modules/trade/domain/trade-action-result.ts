/**
 * Serializable trade server-action result shapes for client error handling.
 * Prefer these over ad-hoc `{ error?: string }` at action boundaries.
 */
export type TradeActionFailure = {
  error: string;
  ok?: false;
};

export type TradeActionOk = {
  ok: true;
};

export type TradeActionEventCreated = {
  eventId: string;
};

/** Common JSON-safe trade action return shapes. */
export type TradeActionResult =
  | TradeActionFailure
  | TradeActionOk
  | TradeActionEventCreated;

/** Narrow server-action unions for client error handling. */
export function getTradeActionError(
  result:
    | TradeActionResult
    | { error?: string }
    | { ok: boolean; error?: string }
    | { eventId?: string; error?: string }
    | null
    | undefined,
): string | null {
  if (!result) return null;
  if ("error" in result && typeof result.error === "string" && result.error) {
    return result.error;
  }
  return null;
}

/** Narrow `{ eventId } | { error }` action results for client navigation. */
export function getTradeActionEventId(
  result:
    | TradeActionEventCreated
    | TradeActionFailure
    | { eventId?: string; error?: string }
    | null
    | undefined,
): string | null {
  if (!result || getTradeActionError(result)) return null;
  if ("eventId" in result && typeof result.eventId === "string" && result.eventId) {
    return result.eventId;
  }
  return null;
}

/** True when a trade action returned a plain CSV / string payload. */
export function isTradeActionStringResult(
  result: string | { error: string } | null | undefined,
): result is string {
  return typeof result === "string";
}

/** Map store/domain throws to stable action error strings. */
export function toTradeActionErrorMessage(
  err: unknown,
  fallback: string,
): string {
  return err instanceof Error ? err.message : fallback;
}

export function tradeActionFailure(error: string): TradeActionFailure {
  return { error };
}

export function tradeActionOk(): TradeActionOk {
  return { ok: true };
}
