import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkSecurityBoundary } from "./check-security-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-security-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/runtime/security/src"), { recursive: true });
	writeFileSync(
		join(root, "packages/runtime/security/package.json"),
		JSON.stringify({ exports: { ".": "./src/index.ts" } }),
	);
	writeFileSync(
		join(root, "packages/runtime/security/src/index.ts"),
		"export const security = Object.freeze({});\n",
	);
	writeFileSync(
		join(root, "apps/web/next.config.ts"),
		"security.headers.create().map(({ name, value }) => ({ key: name, value }));\n",
	);
	return root;
}

test("accepts the leaf security capability and app adapter", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkSecurityBoundary(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects edges, subpaths, deep imports, legacy APIs, and Next leakage", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/runtime/security/package.json"),
			JSON.stringify({
				exports: { ".": "./src/index.ts", "./next": "./src/next.ts" },
				dependencies: { "@afenda/http": "workspace:*" },
			}),
		);
		writeFileSync(
			join(root, "packages/runtime/security/src/next.ts"),
			'import type { NextConfig } from "next";\n',
		);
		writeFileSync(
			join(root, "apps/web/route.ts"),
			'import { securityHeadersForNext } from "@afenda/security/next";\n',
		);
		const violations = checkSecurityBoundary(root);
		for (const expected of [
			"only the root export",
			"runtime workspace dependency",
			"Next.js leaked",
			"deep @afenda/security import",
			"deleted security surface",
		]) {
			assert.ok(
				violations.some((value) => value.includes(expected)),
				expected,
			);
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
