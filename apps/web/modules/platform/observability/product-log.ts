/**
 * API-007 — structured product logs (stdout JSON). No vendor APM SDK.
 */

export type ProductLogLevel = "info" | "warn" | "error";

export type ProductLogEvent = {
	level: ProductLogLevel;
	event: string;
	correlationId: string;
	orgId?: string;
	actorUserId?: string;
	path?: string;
	code?: string;
};

/**
 * Emit one redaction-safe JSON line. Callers must never pass secrets, tokens,
 * SQL, stacks, or full request bodies.
 */
export function logProductEvent(entry: ProductLogEvent): void {
	const line = JSON.stringify({
		ts: new Date().toISOString(),
		service: "afenda-web",
		level: entry.level,
		event: entry.event,
		correlationId: entry.correlationId,
		...(entry.orgId !== undefined ? { orgId: entry.orgId } : {}),
		...(entry.actorUserId !== undefined
			? { actorUserId: entry.actorUserId }
			: {}),
		...(entry.path !== undefined ? { path: entry.path } : {}),
		...(entry.code !== undefined ? { code: entry.code } : {}),
	});

	if (entry.level === "error") {
		console.error(line);
		return;
	}
	if (entry.level === "warn") {
		console.warn(line);
		return;
	}
	console.info(line);
}
