import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
	createNeonCliRunner,
	resolveNeonCliEntrypoint,
} from "../lib/neon-cli.mjs";

const CLI_ENTRYPOINT_PATTERN = /neon[\\/]dist[\\/]cli\.js$/;
const API_KEY_REQUIRED_PATTERN = /NEON_API_KEY is required/;

describe("Neon CLI ingress", () => {
	it("resolves the workspace-pinned CLI entrypoint", () => {
		assert.match(resolveNeonCliEntrypoint(), CLI_ENTRYPOINT_PATTERN);
	});

	it("runs JSON commands without a shell and carries the API key only in env", () => {
		const calls = [];
		const run = createNeonCliRunner({
			execFile: (...callArgs) => {
				calls.push(callArgs);
				return '{"ok":true}';
			},
			resolveCli: () => "C:\\workspace\\node_modules\\neon\\dist\\cli.js",
		});

		const result = run(["projects", "list", "--org-id", "org-1"], {
			apiKey: "napi_secret",
			timeoutMs: 12_345,
		});

		assert.equal(result, '{"ok":true}');
		assert.equal(calls.length, 1);
		const [executable, args, options] = calls[0];
		assert.equal(executable, process.execPath);
		assert.deepEqual(args, [
			"C:\\workspace\\node_modules\\neon\\dist\\cli.js",
			"projects",
			"list",
			"--org-id",
			"org-1",
			"--output",
			"json",
			"--no-analytics",
			"--no-color",
		]);
		assert.equal(options.shell, false);
		assert.equal(options.timeout, 12_345);
		assert.equal(options.env.NEON_API_KEY, "napi_secret");
		assert.equal(args.includes("napi_secret"), false);
	});

	it("fails closed before process execution when the API key is absent", () => {
		let executed = false;
		const run = createNeonCliRunner({
			execFile: () => {
				executed = true;
				return "";
			},
			resolveCli: () => "neon-cli.js",
		});

		assert.throws(
			() => run(["projects", "list"], { apiKey: undefined }),
			API_KEY_REQUIRED_PATTERN,
		);
		assert.equal(executed, false);
	});
});
