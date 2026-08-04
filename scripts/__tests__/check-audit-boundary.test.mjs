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

test("accepts a write whose entry is prepared by an imported sibling module", () => {
	// The shape human-resources/.../time.drizzle.ts uses: audit-command
	// construction factored into one module per feature, rather than the
	// capability call inlined at every write site.
	const root = fixture(
		'import { prepareTimeAudit } from "./time-transactions";\nconst prepared = prepareTimeAudit({});\nconst query = sql`INSERT INTO platform_audit_log (id) VALUES (1)`;\nvoid prepared;\nvoid query;\n',
	);
	try {
		writeFileSync(
			join(root, "apps/web/time-transactions.ts"),
			'import { audit as afendaAudit } from "@afenda/audit";\nexport const prepareTimeAudit = (input) => afendaAudit.transaction.prepare(input);\n',
		);
		const result = run(root);
		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("still rejects a write whose sibling helper fakes the entry", () => {
	// The loosening must not become "import anything and you are exempt": the
	// helper has to actually reach the capability.
	const root = fixture(
		'import { prepareTimeAudit } from "./hand-rolled";\nconst prepared = prepareTimeAudit({});\nconst query = sql`INSERT INTO platform_audit_log (id) VALUES (1)`;\nvoid prepared;\nvoid query;\n',
	);
	try {
		writeFileSync(
			join(root, "apps/web/hand-rolled.ts"),
			"export const prepareTimeAudit = (input) => ({ ...input, id: crypto.randomUUID() });\n",
		);
		const result = run(root);
		assert.equal(result.status, 1);
		assert.match(result.output, BYPASS_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
