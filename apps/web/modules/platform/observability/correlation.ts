/**
 * API-007 — correlation identity for critical Server Actions and edge gate.
 */

export const CORRELATION_HEADER = "x-correlation-id" as const;

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when `value` is a UUID suitable for correlation propagation. */
export function isCorrelationId(value: string | null | undefined): boolean {
	if (value === null || value === undefined) {
		return false;
	}
	return UUID_RE.test(value.trim());
}

/**
 * Prefer a valid inbound correlation id; otherwise mint a new UUID.
 */
export function resolveCorrelationId(
	inbound: string | null | undefined,
): string {
	const trimmed = inbound?.trim();
	if (trimmed && isCorrelationId(trimmed)) {
		return trimmed;
	}
	return crypto.randomUUID();
}

export function createCorrelationId(): string {
	return crypto.randomUUID();
}
