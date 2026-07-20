import type { LogLevel, ProductLogLevel } from "./types";

type ConsoleLevel = ProductLogLevel | Extract<LogLevel, "debug">;

const CONSOLE_BY_LEVEL = {
	error: (line: string) => {
		console.error(line);
	},
	warn: (line: string) => {
		console.warn(line);
	},
	debug: (line: string) => {
		console.debug(line);
	},
	info: (line: string) => {
		console.info(line);
	},
} as const satisfies Record<ConsoleLevel, (line: string) => void>;

export function emitConsoleJson(
	level: ConsoleLevel,
	fields: Record<string, unknown>,
): void {
	CONSOLE_BY_LEVEL[level](JSON.stringify(fields));
}
