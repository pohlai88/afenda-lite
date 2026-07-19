import type { ProductLogEvent } from "./types";

const DEFAULT_PRODUCT_SERVICE = "afenda-web";

export function resolveProductService(service?: string): string {
	return service ?? DEFAULT_PRODUCT_SERVICE;
}

/** Allowlisted product fields only — no open metadata bags. */
export function toProductLogRecord(
	entry: ProductLogEvent,
	service?: string,
): Record<string, string> {
	const record: Record<string, string> = {
		ts: new Date().toISOString(),
		service: resolveProductService(service),
		level: entry.level,
		event: entry.event,
		correlationId: entry.correlationId,
	};

	if (entry.orgId !== undefined) {
		record.orgId = entry.orgId;
	}
	if (entry.actorUserId !== undefined) {
		record.actorUserId = entry.actorUserId;
	}
	if (entry.path !== undefined) {
		record.path = entry.path;
	}
	if (entry.code !== undefined) {
		record.code = entry.code;
	}

	return record;
}
