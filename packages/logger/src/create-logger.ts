import pino, { type Logger } from "pino";

import { DEFAULT_REDACT_PATHS } from "./redact-paths";
import type { CreateLoggerOptions, LogLevel } from "./types";

const DEFAULT_LEVEL: LogLevel = "info";

export function createLogger(options: CreateLoggerOptions): Logger {
	const level = options.level ?? DEFAULT_LEVEL;

	return pino({
		level,
		base: { service: options.service },
		timestamp: pino.stdTimeFunctions.isoTime,
		formatters: {
			level(label) {
				return { level: label };
			},
		},
		redact: {
			paths: [...DEFAULT_REDACT_PATHS],
			censor: "[Redacted]",
		},
	});
}
