import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkAdminBoundary } from "./check-admin-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-admin-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/control-plane/admin/src"), {
		recursive: true,
	});
	writeFileSync(
		join(root, "packages/control-plane/admin/package.json"),
		JSON.stringify({
			exports: {
				".": "./src/index.ts",
				"./audit": "./src/audit-entry.ts",
				"./health": "./src/health-entry.ts",
			},
			dependencies: Object.fromEntries(
				["@afenda/auth", "@afenda/db", "@afenda/env", "@afenda/errors"].map(
					(name) => [name, "workspace:"],
				),
			),
		}),
	);
	writeFileSync(
		join(root, "packages/control-plane/admin/src/index.ts"),
		"export const admin = {};\n",
	);
	writeFileSync(
		join(root, "apps/web/consumer.ts"),
		'import { admin } from "@afenda/admin";\nadmin.organizations.list();\n',
	);
	return root;
}

test("accepts the permanent admin capability", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkAdminBoundary(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects export, dependency, subpath, legacy, RBAC table and vendor leaks", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/control-plane/admin/package.json"),
			JSON.stringify({
				exports: { ".": "./src/index.ts", "./usage": "./src/usage.ts" },
				dependencies: { "@afenda/audit": "workspace:*" },
			}),
		);
		writeFileSync(
			join(root, "packages/control-plane/admin/src/vendor.ts"),
			'import { createAuthClient } from "@neondatabase/auth/next";\ncreateAuthClient();\n',
		);
		writeFileSync(
			join(root, "apps/web/consumer.ts"),
			'import { getOrganizationUsageMetrics } from "@afenda/admin/usage";\nplatformRbacAudit;\ngetOrganizationUsageMetrics();\n',
		);
		const violations = checkAdminBoundary(root);
		for (const expected of [
			"only root, ./audit and ./health",
			"unauthorized workspace dependency",
			"prohibited @afenda/admin subpath",
			"deleted standalone admin runtime",
			"direct platform_rbac_audit",
			"owns no Neon Auth client",
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
