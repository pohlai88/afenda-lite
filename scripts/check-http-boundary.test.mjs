import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkHttpBoundary } from "./check-http-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-http-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/runtime/http/src"), { recursive: true });
	writeFileSync(join(root, "packages/runtime/http/package.json"), JSON.stringify({ exports: { ".": "./src/index.ts" } }));
	writeFileSync(join(root, "packages/runtime/http/src/index.ts"), "export const http = Object.freeze({});\n");
	return root;
}

test("accepts the leaf HTTP capability", () => {
	const root = fixture();
	try { assert.deepEqual(checkHttpBoundary(root), []); } finally { rmSync(root, { recursive: true, force: true }); }
});

test("rejects workspace edges, subpaths, deep imports, and deleted facades", () => {
	const root = fixture();
	try {
		writeFileSync(join(root, "packages/runtime/http/package.json"), JSON.stringify({ exports: { ".": "./src/index.ts", "./internal": "./src/internal.ts" }, dependencies: { "@afenda/errors": "workspace:*" } }));
		writeFileSync(join(root, "apps/web/route.ts"), 'import { createCorrelationId } from "@afenda/http/internal";\n');
		const violations = checkHttpBoundary(root);
		assert.ok(violations.some((value) => value.includes("only the root export")));
		assert.ok(violations.some((value) => value.includes("runtime workspace dependency")));
		assert.ok(violations.some((value) => value.includes("deep @afenda/http import")));
		assert.ok(violations.some((value) => value.includes("deleted HTTP surface")));
	} finally { rmSync(root, { recursive: true, force: true }); }
});
