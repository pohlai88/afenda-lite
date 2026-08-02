import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

export function resolveNeonCliEntrypoint() {
	return require.resolve("neon/cli");
}

export function createNeonCliRunner({
	execFile = execFileSync,
	resolveCli = resolveNeonCliEntrypoint,
} = {}) {
	return function executeNeonCliJson(
		args,
		{ apiKey, timeoutMs = DEFAULT_TIMEOUT_MS },
	) {
		if (!apiKey?.startsWith("napi_")) {
			throw new Error("NEON_API_KEY is required to run the Neon CLI");
		}

		return execFile(
			process.execPath,
			[
				resolveCli(),
				...args,
				"--output",
				"json",
				"--no-analytics",
				"--no-color",
			],
			{
				env: { ...process.env, NEON_API_KEY: apiKey },
				encoding: "utf8",
				shell: false,
				windowsHide: true,
				maxBuffer: MAX_BUFFER_BYTES,
				timeout: timeoutMs,
			},
		);
	};
}

export const runNeonCliJson = createNeonCliRunner();
