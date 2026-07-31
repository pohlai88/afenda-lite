import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const script = resolve("scripts/check-db-boundary.mjs");
const CHECK_OK_PATTERN = /check-db-boundary: ok/u;
const LEGACY_DB_PATTERN = /legacy @afenda\/db root import db/u;
const LEGACY_ORG_WHERE_PATTERN = /legacy @afenda\/db root import orgWhere/u;
const UNPUBLISHED_SUBPATH_PATTERN = /unpublished @afenda\/db subpath import/u;

function fixture(source) {
	const root = mkdtempSync(join(tmpdir(), "afenda-db-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/data-plane/db/src"), { recursive: true });
	writeFileSync(join(root, "apps/web/source.ts"), source);
	writeFileSync(
		join(root, "packages/data-plane/db/src/index.ts"),
		'export { database } from "./capabilities/database";\n',
	);
	return root;
}

function run(root) {
	try {
		return {
			status: 0,
			output: execFileSync("node", [script], { cwd: root, encoding: "utf8" }),
		};
	} catch (error) {
		return {
			status: error.status,
			output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
		};
	}
}

test("accepts the permanent database facade", () => {
	const root = fixture(
		'import { database, eq } from "@afenda/db";\nvoid database.client; void eq;\n',
	);
	try {
		const result = run(root);
		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects deleted runtime imports", () => {
	const root = fixture(
		'import { db, orgWhere } from "@afenda/db";\nvoid db; void orgWhere;\n',
	);
	try {
		const result = run(root);
		assert.equal(result.status, 1);
		assert.match(result.output, LEGACY_DB_PATTERN);
		assert.match(result.output, LEGACY_ORG_WHERE_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects unpublished implementation subpaths", () => {
	const root = fixture(
		'import { db } from "@afenda/db/src/client";\nvoid db;\n',
	);
	try {
		const result = run(root);
		assert.equal(result.status, 1);
		assert.match(result.output, UNPUBLISHED_SUBPATH_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
