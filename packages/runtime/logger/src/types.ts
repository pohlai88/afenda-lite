import type { LOG_FIELD_REGISTRY } from "./semantic-registry";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogFieldName = keyof typeof LOG_FIELD_REGISTRY;

type RequiredLogFieldName = {
	[Field in LogFieldName]: (typeof LOG_FIELD_REGISTRY)[Field]["required"] extends true
		? Field
		: never;
}[LogFieldName];

type OptionalLogFieldName = Exclude<LogFieldName, RequiredLogFieldName>;

export type StructuredLogFields = {
	readonly [Field in RequiredLogFieldName]: string;
} & {
	readonly [Field in OptionalLogFieldName]?: string;
};

export type StructuredLogEvent = StructuredLogFields & {
	readonly level: LogLevel;
};

export interface LogEventOptions {
	readonly service?: string;
}

export interface LoggerCapability {
	event: (entry: StructuredLogEvent, options?: LogEventOptions) => void;
	redactFieldValue: (name: string, value: string) => string;
}
