/** Positive whole seconds until `resetAtMs` (wall clock). */
export function retryAfterSecondsFromReset(
	resetAtMs: number,
	nowMs: number,
): number {
	return Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
}
