import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";

import { checkPackageScaffoldResidue } from "../check-package-scaffold-residue.mjs";

/**
 * Two packages: one consumed by apps/web, one with no consumer at all.
 * Both start with authored READMEs.
 */
function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-scaffold-residue-"));

	mkdirSync(join(root, "apps/web"), { recursive: true });
	writeFileSync(
		join(root, "apps/web/package.json"),
		JSON.stringify({ name: "@afenda/web" }),
	);
	writeFileSync(
		join(root, "apps/web/consumer.ts"),
		'import { registerEstablishment } from "@afenda/consumed";\nregisterEstablishment();\n',
	);

	for (const leaf of ["consumed", "fresh"]) {
		mkdirSync(join(root, `packages/erp/${leaf}/src`), { recursive: true });
		writeFileSync(
			join(root, `packages/erp/${leaf}/package.json`),
			JSON.stringify({ name: `@afenda/${leaf}` }),
		);
		writeFileSync(
			join(root, `packages/erp/${leaf}/README.md`),
			`# @afenda/${leaf}\n\nAuthored capability description.\n`,
		);
	}

	return root;
}

test("accepts packages whose owners are authored", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkPackageScaffoldResidue(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects a consumed package overwritten by a generator scaffold", () => {
	const root = fixture();
	try {
		// Exactly what 19b00b30 left behind in corporate-administration.
		writeFileSync(
			join(root, "packages/erp/consumed/README.md"),
			"# @afenda/consumed\n\nGenerated ERP package scaffold. Fill semantic owners before activation.\n",
		);
		const violations = checkPackageScaffoldResidue(root);
		assert.ok(
			violations.some((value) =>
				value.includes("Generated ERP package scaffold"),
			),
			"expected the generator marker to be reported",
		);
		assert.ok(
			violations.every((value) => value.includes("packages/erp/consumed")),
			"only the consumed package should be reported",
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("permits an unconsumed scaffold — that is what a generator is for", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/erp/fresh/README.md"),
			"# @afenda/fresh\n\nGenerated ERP package scaffold. Fill semantic owners before activation.\n",
		);
		assert.deepEqual(checkPackageScaffoldResidue(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("inspects PRD.md as well as README.md", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/erp/consumed/PRD.md"),
			"# PRD\n\nTODO: describe this package\n",
		);
		const violations = checkPackageScaffoldResidue(root);
		assert.ok(
			violations.some((value) => value.includes("PRD.md")),
			"expected PRD placeholder to be reported",
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
