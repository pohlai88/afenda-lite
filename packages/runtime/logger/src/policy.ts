import {
	DEFAULT_LOG_SERVICE,
	LOG_FIELD_REGISTRY,
	LOG_REDACTION_POLICY,
} from "./semantic-registry";
import type { LogEventOptions, LogLevel, StructuredLogEvent } from "./types";

type LogFieldName = keyof typeof LOG_FIELD_REGISTRY;

const LOG_FIELD_NAMES = Object.keys(LOG_FIELD_REGISTRY) as LogFieldName[];

function normalizeFieldName(name: string): string {
	return name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

const SENSITIVE_FIELD_NAMES = new Set(
	LOG_REDACTION_POLICY.fieldNames.map(normalizeFieldName),
);

export const PINO_REDACT_PATHS = LOG_REDACTION_POLICY.fieldNames.flatMap(
	(name) => [name, `*.${name}`],
);

type ProjectedLogRecord = Record<string, string> & {
	level: LogLevel;
	service: string;
};

export function redactFieldValue(name: string, value: string): string {
	const normalized = normalizeFieldName(name);
	if (
		SENSITIVE_FIELD_NAMES.has(normalized) ||
		normalized.includes("secret") ||
		normalized.includes("token")
	) {
		return LOG_REDACTION_POLICY.censor;
	}
	return value;
}

export function projectLogRecord(
	entry: StructuredLogEvent,
	options?: LogEventOptions,
): ProjectedLogRecord {
	const record: ProjectedLogRecord = {
		service: options?.service ?? DEFAULT_LOG_SERVICE,
		level: entry.level,
	};

	for (const field of LOG_FIELD_NAMES) {
		const value = entry[field];
		if (value !== undefined) {
			record[field] = redactFieldValue(field, value);
		}
	}

	return record;
}
