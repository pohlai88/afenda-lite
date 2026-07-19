import { emitConsoleJson } from "./emit-console";
import { toProductLogRecord } from "./product-fields";
import type {
	CreateLoggerOptions,
	EdgeLogger,
	EdgeLoggerBindings,
	LogLevel,
	LogProductEventOptions,
	ProductLogEvent,
} from "./types";

/**
 * Edge-safe product events (proxy / middleware). Same allowlisted fields as
 * Node `logProductEvent` — no Pino / Node streams.
 */
export function logProductEvent(
	entry: ProductLogEvent,
	options?: LogProductEventOptions,
): void {
	emitConsoleJson(entry.level, toProductLogRecord(entry, options?.service));
}

function emitEdge(
	service: string,
	level: LogLevel,
	bindings: EdgeLoggerBindings,
	fields: Record<string, unknown>,
	msg?: string,
): void {
	emitConsoleJson(level, {
		time: new Date().toISOString(),
		service,
		level,
		...bindings,
		...fields,
		...(msg !== undefined ? { msg } : {}),
	});
}

export function createEdgeLogger(options: CreateLoggerOptions): EdgeLogger {
	const service = options.service;

	function make(bindings: EdgeLoggerBindings): EdgeLogger {
		return {
			debug(fields, msg) {
				emitEdge(service, "debug", bindings, fields, msg);
			},
			info(fields, msg) {
				emitEdge(service, "info", bindings, fields, msg);
			},
			warn(fields, msg) {
				emitEdge(service, "warn", bindings, fields, msg);
			},
			error(fields, msg) {
				emitEdge(service, "error", bindings, fields, msg);
			},
			child(next) {
				return make({ ...bindings, ...next });
			},
		};
	}

	return make({});
}

export type {
	CreateLoggerOptions,
	EdgeLogger,
	EdgeLoggerBindings,
	LogProductEventOptions,
	ProductLogEvent,
	ProductLogLevel,
} from "./types";
