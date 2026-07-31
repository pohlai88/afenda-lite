import { projectLogRecord, redactFieldValue } from "./policy";
import type {
	LogEventOptions,
	LoggerCapability,
	StructuredLogEvent,
} from "./types";

const CONSOLE_BY_LEVEL = {
	error: (line: string) => console.error(line),
	warn: (line: string) => console.warn(line),
	debug: (line: string) => console.debug(line),
	info: (line: string) => console.info(line),
} as const;

function emitEdgeEvent(
	entry: StructuredLogEvent,
	options?: LogEventOptions,
): void {
	CONSOLE_BY_LEVEL[entry.level](
		JSON.stringify({
			time: new Date().toISOString(),
			...projectLogRecord(entry, options),
		}),
	);
}

export const logger = {
	event: emitEdgeEvent,
	redactFieldValue,
} satisfies LoggerCapability;

export type {
	LogEventOptions,
	LoggerCapability,
	LogLevel,
	StructuredLogEvent,
	StructuredLogFields,
} from "./types";
