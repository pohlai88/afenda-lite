import { emitNodeEvent } from "./node-projection";
import { redactFieldValue } from "./policy";
import type { LoggerCapability } from "./types";

export const logger = {
	event: emitNodeEvent,
	redactFieldValue,
} satisfies LoggerCapability;

export type {
	LogEventOptions,
	LoggerCapability,
	LogLevel,
	StructuredLogEvent,
	StructuredLogFields,
} from "./types";
