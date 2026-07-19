/**
 * API-007 — structured product logs. Implementation lives in `@afenda/logger`
 * (Pino on Node). Edge proxy imports `@afenda/logger/edge`.
 */

export {
	logProductEvent,
	type ProductLogEvent,
	type ProductLogLevel,
} from "@afenda/logger";
