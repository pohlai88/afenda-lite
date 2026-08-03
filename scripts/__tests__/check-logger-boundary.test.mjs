import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";

import { checkLoggerBoundary } from "../check-logger-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-logger-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/runtime/logger/src"), { recursive: true });
	writeFileSync(
		join(root, "packages/runtime/logger/package.json"),
		`${JSON.stringify({ name: "@afenda/logger", exports: { ".": "./src/index.ts", "./edge": "./src/edge.ts" }, dependencies: { pino: "catalog:" } })}\n`,
	);
	for (const file of [
		"edge.ts",
		"policy.ts",
		"semantic-registry.ts",
		"types.ts",
	]) {
		writeFileSync(
			join(root, "packages/runtime/logger/src", file),
			"export {};\n",
		);
	}
	return root;
}

function dispose(root) {
	rmSync(root, { recursive: true, force: true });
}

test("accepts the leaf logger contract", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkLoggerBoundary(root), []);
	} finally {
		dispose(root);
	}
});

test("rejects runtime workspace dependencies and direct pino consumers", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/runtime/logger/package.json"),
			`${JSON.stringify({ exports: { ".": "./src/index.ts", "./edge": "./src/edge.ts" }, dependencies: { "@afenda/errors": "workspace:*", pino: "catalog:" } })}\n`,
		);
		writeFileSync(join(root, "apps/web/log.ts"), 'import pino from "pino";\n');
		const violations = checkLoggerBoundary(root);
		assert.ok(
			violations.some((value) =>
				value.includes("runtime workspace dependency"),
			),
		);
		assert.ok(
			violations.some((value) => value.includes("direct pino dependency")),
		);
	} finally {
		dispose(root);
	}
});

test("rejects legacy surfaces and Node code in the edge graph", () => {
	const root = fixture();
	try {
		writeFileSync(join(root, "apps/web/log.ts"), "logProductEvent({});\n");
		writeFileSync(
			join(root, "packages/runtime/logger/src/edge.ts"),
			'import pino from "pino";\n',
		);
		const violations = checkLoggerBoundary(root);
		assert.ok(
			violations.some((value) => value.includes("deleted logger surface")),
		);
		assert.ok(
			violations.some((value) => value.includes("edge graph loads Node/Pino")),
		);
	} finally {
		dispose(root);
	}
});
