/** Narrow server-action unions for client error handling. */
export function getTradeActionError(
  result: { error?: string } | { ok: boolean },
): string | null {
  if ("error" in result && result.error) return result.error;
  return null;
}
