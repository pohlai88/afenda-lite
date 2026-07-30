export type LogLevel = "debug" | "info" | "warn" | "error";

export type ProductLogLevel = "info" | "warn" | "error";

/**
 * Closed product-event allowlist. Callers must never pass secrets, tokens,
 * SQL, stacks, or full request bodies.
 */
export interface ProductLogEvent {
	actorUserId?: string;
	code?: string;
	correlationId: string;
	event: string;
	level: ProductLogLevel;
	orgId?: string;
	path?: string;
}

export interface LogProductEventOptions {
	service?: string;
}

export interface CreateLoggerOptions {
	level?: LogLevel;
	service: string;
}

export interface EdgeLoggerBindings {
	readonly correlationId?: string;
	readonly module?: string;
}

export interface EdgeLogger {
	child: (bindings: EdgeLoggerBindings) => EdgeLogger;
	debug: (fields: Record<string, unknown>, msg?: string) => void;
	error: (fields: Record<string, unknown>, msg?: string) => void;
	info: (fields: Record<string, unknown>, msg?: string) => void;
	warn: (fields: Record<string, unknown>, msg?: string) => void;
}
