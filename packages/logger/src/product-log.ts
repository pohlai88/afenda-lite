import { createLogger } from "./create-logger";
import { resolveProductService } from "./product-fields";
import type { ProductLogEvent } from "./types";

type LogProductEventOptions = {
	service?: string;
};

const productLoggers = new Map<string, ReturnType<typeof createLogger>>();

function getProductLogger(service: string) {
	const existing = productLoggers.get(service);
	if (existing) {
		return existing;
	}
	const created = createLogger({ service });
	productLoggers.set(service, created);
	return created;
}

function toPinoPayload(entry: ProductLogEvent): Record<string, string> {
	const payload: Record<string, string> = {
		event: entry.event,
		correlationId: entry.correlationId,
	};
	if (entry.orgId !== undefined) {
		payload.orgId = entry.orgId;
	}
	if (entry.actorUserId !== undefined) {
		payload.actorUserId = entry.actorUserId;
	}
	if (entry.path !== undefined) {
		payload.path = entry.path;
	}
	if (entry.code !== undefined) {
		payload.code = entry.code;
	}
	return payload;
}

/**
 * Emit one allowlisted product event via Pino (Node). Edge proxy must use
 * `@afenda/logger/edge` instead.
 */
export function logProductEvent(
	entry: ProductLogEvent,
	options?: LogProductEventOptions,
): void {
	const service = resolveProductService(options?.service);
	const logger = getProductLogger(service);
	const payload = toPinoPayload(entry);

	switch (entry.level) {
		case "error":
			logger.error(payload);
			return;
		case "warn":
			logger.warn(payload);
			return;
		case "info":
			logger.info(payload);
			return;
		default: {
			const _exhaustive: never = entry.level;
			return _exhaustive;
		}
	}
}

export type { ProductLogEvent, ProductLogLevel } from "./types";
