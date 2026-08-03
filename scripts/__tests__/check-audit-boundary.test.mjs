import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "vitest";

const script = resolve("scripts/check-audit-boundary.mjs");
const CHECK_OK_PATTERN = /check-audit-boundary: ok/u;
const NAMED_RUNTIME_PATTERN =
	/named runtime @afenda\/audit import is forbidden/u;
const UNPUBLISHED_SUBPATH_PATTERN =
	/unpublished @afenda\/audit subpath import/u;
const BYPASS_PATTERN = /bypasses the canonical transaction capability/u;

function fixture(source) {
	const root = mkdtempSync(join(tmpdir(), "afenda-audit-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/data-plane/audit/src"), { recursive: true });
	writeFileSync(join(root, "apps/web/source.ts"), source);
	writeFileSync(
		join(root, "packages/data-plane/audit/src/index.ts"),
		'export { audit } from "./capabilities/audit";\n',
	);
	return root;
}

function run(root) {
	try {
		return {
			status: 0,
			output: execFileSync("node", [script], {
				cwd: root,
				encoding: "utf8",
			}),
		};
	} catch (error) {
		return {
			status: error.status,
			output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
		};
	}
}

test("accepts the permanent facade and structural types", () => {
	const root = fixture(
		'import { audit as afendaAudit, type AuditEntry } from "@afenda/audit";\nvoid afendaAudit; let entry: AuditEntry; void entry;\n',
	);
	try {
		const result = run(root);
		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects deleted named runtime imports", () => {
	const root = fixture(
		'import { createAuditRecorder } from "@afenda/audit";\nvoid createAuditRecorder;\n',
	);
	try {
		const result = run(root);
		assert.equal(result.status, 1);
		assert.match(result.output, NAMED_RUNTIME_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects unpublished subpaths", () => {
	const root = fixture(
		'import { createAuditRecorder } from "@afenda/audit/src/recorder";\nvoid createAuditRecorder;\n',
	);
	try {
		const result = run(root);
		assert.equal(result.status, 1);
		assert.match(result.output, UNPUBLISHED_SUBPATH_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects unprepared production audit-table writes", () => {
	const root = fixture(
		"const query = sql`INSERT INTO platform_audit_log (id) VALUES (1)`;\nvoid query;\n",
	);
	try {
		const result = run(root);
		assert.equal(result.status, 1);
		assert.match(result.output, BYPASS_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
