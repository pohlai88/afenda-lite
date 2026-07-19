import type { ProductLogEvent } from "./types";

const DEFAULT_PRODUCT_SERVICE = "afenda-web";

export function resolveProductService(service?: string): string {
	return service ?? DEFAULT_PRODUCT_SERVICE;
}

/** Allowlisted business fields shared by Node (Pino) and edge sinks. */
export function toProductAllowlistFields(
	entry: ProductLogEvent,
): Record<string, string> {
	const fields: Record<string, string> = {
		event: entry.event,
		correlationId: entry.correlationId,
	};

	if (entry.orgId !== undefined) {
		fields.orgId = entry.orgId;
	}
	if (entry.actorUserId !== undefined) {
		fields.actorUserId = entry.actorUserId;
	}
	if (entry.path !== undefined) {
		fields.path = entry.path;
	}
	if (entry.code !== undefined) {
		fields.code = entry.code;
	}

	return fields;
}

/**
 * Full edge/console product line. Uses `time` (ISO) to match Pino
 * `stdTimeFunctions.isoTime` so ops filters one timestamp key.
 */
export function toProductLogRecord(
	entry: ProductLogEvent,
	service?: string,
): Record<string, string> {
	return {
		time: new Date().toISOString(),
		service: resolveProductService(service),
		level: entry.level,
		...toProductAllowlistFields(entry),
	};
}
