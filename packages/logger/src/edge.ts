import { emitConsoleJson } from "./emit-console";
import { resolveProductService, toProductLogRecord } from "./product-fields";
import type {
	CreateLoggerOptions,
	EdgeLogger,
	EdgeLoggerBindings,
	LogLevel,
	ProductLogEvent,
} from "./types";

type LogProductEventOptions = {
	service?: string;
};

/**
 * Edge-safe product events (proxy / middleware). Same allowlisted fields as
 * Node `logProductEvent` — no Pino / Node streams.
 */
export function logProductEvent(
	entry: ProductLogEvent,
	options?: LogProductEventOptions,
): void {
	const record = toProductLogRecord(entry, options?.service);
	emitConsoleJson(entry.level, record);
}

function emitEdge(
	service: string,
	level: LogLevel,
	bindings: EdgeLoggerBindings,
	fields: Record<string, unknown>,
	msg?: string,
): void {
	const line: Record<string, unknown> = {
		ts: new Date().toISOString(),
		service,
		level,
		...bindings,
		...fields,
	};
	if (msg !== undefined) {
		line.msg = msg;
	}
	emitConsoleJson(level, line);
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
	ProductLogEvent,
	ProductLogLevel,
} from "./types";

export { resolveProductService };
