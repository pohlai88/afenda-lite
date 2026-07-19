import type { LogLevel, ProductLogLevel } from "./types";

type ConsoleLevel = ProductLogLevel | Extract<LogLevel, "debug">;

export function emitConsoleJson(
	level: ConsoleLevel,
	fields: Record<string, unknown>,
): void {
	const line = JSON.stringify(fields);

	switch (level) {
		case "error":
			console.error(line);
			return;
		case "warn":
			console.warn(line);
			return;
		case "debug":
			console.debug(line);
			return;
		case "info":
			console.info(line);
			return;
		default: {
			const _exhaustive: never = level;
			return _exhaustive;
		}
	}
}
