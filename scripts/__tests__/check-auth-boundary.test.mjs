import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";

import { checkAuthBoundary } from "../check-auth-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-auth-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/control-plane/auth/src"), { recursive: true });
	writeFileSync(
		join(root, "packages/control-plane/auth/package.json"),
		JSON.stringify({
			exports: { ".": "./src/index.ts", "./client": "./src/client.ts" },
			dependencies: Object.fromEntries(
				[
					"@afenda/env",
					"@afenda/errors",
					"@afenda/http",
					"@afenda/logger",
					"@afenda/rate-limit",
				].map((name) => [name, "workspace:"]),
			),
		}),
	);
	writeFileSync(
		join(root, "packages/control-plane/auth/src/client.ts"),
		'export { authBrowser } from "./capability";\n',
	);
	writeFileSync(
		join(root, "apps/web/consumer.ts"),
		'import { authServer } from "@afenda/auth";\nauthServer.session.get();\n',
	);
	return root;
}

test("accepts the permanent server capability", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkAuthBoundary(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects dependency, subpath, vendor, legacy, fallback and client leaks", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/control-plane/auth/package.json"),
			JSON.stringify({
				exports: {
					".": "./src/index.ts",
					"./client": "./src/client.ts",
					"./session": "./src/session.ts",
				},
				dependencies: { "@afenda/db": "workspace:*" },
			}),
		);
		writeFileSync(
			join(root, "packages/control-plane/auth/src/client.ts"),
			'import "server-only";\nexport const resetBrowserAuthClientForTests = () => {};\n',
		);
		writeFileSync(
			join(root, "apps/web/consumer.ts"),
			'import { getSession } from "@afenda/auth/session";\nimport { createAuthClient } from "@neondatabase/auth/next";\nconst orgId = session.orgId || "default";\ngetSession(); createAuthClient();\n',
		);
		const violations = checkAuthBoundary(root);
		for (const expected of [
			"only root and ./client",
			"unauthorized workspace dependency",
			"implementation subpath",
			"direct Neon Auth",
			"organization fallback",
			"browser boundary imports server-only",
			"test reset hook is public",
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
