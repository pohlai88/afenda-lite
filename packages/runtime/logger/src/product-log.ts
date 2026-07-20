import type { Logger } from "pino";

import { createLogger } from "./create-logger";
import {
	resolveProductService,
	toProductAllowlistFields,
} from "./product-fields";
import type {
	LogProductEventOptions,
	ProductLogEvent,
	ProductLogLevel,
} from "./types";

const productLoggers = new Map<string, Logger>();

function getProductLogger(service: string): Logger {
	const existing = productLoggers.get(service);
	if (existing) {
		return existing;
	}
	const created = createLogger({ service });
	productLoggers.set(service, created);
	return created;
}

function emitProduct(
	logger: Logger,
	level: ProductLogLevel,
	payload: Record<string, string>,
): void {
	switch (level) {
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
			const _exhaustive: never = level;
			void _exhaustive;
		}
	}
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
	emitProduct(
		getProductLogger(service),
		entry.level,
		toProductAllowlistFields(entry),
	);
}
