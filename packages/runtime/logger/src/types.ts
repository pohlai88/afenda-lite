export type LogLevel = "debug" | "info" | "warn" | "error";

export type ProductLogLevel = "info" | "warn" | "error";

/**
 * Closed product-event allowlist. Callers must never pass secrets, tokens,
 * SQL, stacks, or full request bodies.
 */
export type ProductLogEvent = {
	level: ProductLogLevel;
	event: string;
	correlationId: string;
	orgId?: string;
	actorUserId?: string;
	path?: string;
	code?: string;
};

export type LogProductEventOptions = {
	service?: string;
};

export type CreateLoggerOptions = {
	service: string;
	level?: LogLevel;
};

export type EdgeLoggerBindings = {
	readonly correlationId?: string;
	readonly module?: string;
};

export type EdgeLogger = {
	debug: (fields: Record<string, unknown>, msg?: string) => void;
	info: (fields: Record<string, unknown>, msg?: string) => void;
	warn: (fields: Record<string, unknown>, msg?: string) => void;
	error: (fields: Record<string, unknown>, msg?: string) => void;
	child: (bindings: EdgeLoggerBindings) => EdgeLogger;
};
