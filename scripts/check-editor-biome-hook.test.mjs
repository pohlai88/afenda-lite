/**
 * @file Negative fixtures for no-editor-biome-drift hook policy.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const hook = path.join(root, ".cursor/hooks/no-editor-biome-drift.mjs");

/**
 * @param {Record<string, unknown>} payload
 */
function runHook(payload) {
	const result = spawnSync(process.execPath, [hook], {
		cwd: root,
		input: JSON.stringify(payload),
		encoding: "utf8",
	});
	const line = (result.stdout || "").trim().split("\n").at(-1) ?? "{}";
	return JSON.parse(line);
}

function readFileSafe() {
	return readFileSync(path.join(root, ".vscode/settings.json"), "utf8");
}

const denyPayload = {
	tool_name: "Write",
	tool_input: {
		path: ".vscode/settings.json",
		contents: JSON.stringify(
			{
				"biome.enabled": true,
				"biome.requireConfiguration": true,
				"biome.lsp.watcher.kind": "recommended",
				"explorer.excludeGitIgnore": true,
				"typescript.disableAutomaticTypeAcquisition": false,
				"[typescript]": {
					"editor.defaultFormatter": "esbenp.prettier-vscode",
				},
			},
			null,
			"\t",
		),
	},
};

const allowPayload = {
	tool_name: "Write",
	tool_input: {
		path: ".vscode/settings.json",
		contents: readFileSafe(),
	},
};

const denied = runHook(denyPayload);
assert.equal(denied.permission, "deny", "must deny posture regressions");

const allowed = runHook(allowPayload);
assert.equal(allowed.permission, "allow", "must allow committed settings");

console.log("no-editor-biome-drift hook policy: OK");
