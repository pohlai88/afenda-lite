import pino, { type Logger } from "pino";

import { PINO_REDACT_PATHS, projectLogRecord } from "./policy";
import { LOG_REDACTION_POLICY } from "./semantic-registry";
import type { LogEventOptions, StructuredLogEvent } from "./types";

const nodeLoggers = new Map<string, Logger>();

function getNodeLogger(service: string): Logger {
	const existing = nodeLoggers.get(service);
	if (existing) {
		return existing;
	}

	const created = pino({
		base: null,
		timestamp: pino.stdTimeFunctions.isoTime,
		formatters: {
			level(label) {
				return { level: label };
			},
		},
		redact: {
			paths: [...PINO_REDACT_PATHS],
			censor: LOG_REDACTION_POLICY.censor,
		},
	});
	nodeLoggers.set(service, created);
	return created;
}

export function emitNodeEvent(
	entry: StructuredLogEvent,
	options?: LogEventOptions,
): void {
	const record = projectLogRecord(entry, options);
	const { level, service, ...fields } = record;
	getNodeLogger(service)[level]({ service, ...fields });
}
