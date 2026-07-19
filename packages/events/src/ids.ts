import { randomUUID } from "node:crypto";

/** Correlation id for a new causal chain. */
export function generateCorrelationId(): string {
	return randomUUID();
}

/** Causation id linking a child event to its parent event id. */
export function generateCausationId(parentEventId?: string): string {
	return parentEventId ?? randomUUID();
}
