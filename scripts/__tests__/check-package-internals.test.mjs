/**
 * Negative fixtures for check:package-internals (ENV-GOV-1 slice D).
 *
 * The gate must fire on cross-package internal-source *resolution or execution*
 * while staying silent on package paths used as data. Governance scripts carry
 * package source paths as scan roots and diagnostic strings; a gate that
 * flagged those would fire on the repository's own tooling and be turned off.
 *
 * Fixture sources are assembled at runtime so this file does not itself contain
 * the violating literals it tests for.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const checker = path.join(repoRoot, "scripts/check-package-internals.mjs");
const fixtureParent = path.join(
	repoRoot,
	"node_modules/.cache/package-internals-fixtures",
);

// Assembled, not literal — otherwise this fixture file would trip the gate.
const OTHER_PACKAGE_SRC = `packages/data-plane/${"db"}/src/client.ts`;
const OTHER_PACKAGE_SPECIFIER = `@afenda/${"db"}/src/client`;

function runChecker(root) {
	try {
		const stdout = execFileSync(process.execPath, [checker, "--root", root], {
			cwd: repoRoot,
			encoding: "utf8",
			stdio: "pipe",
		});
		return { ok: true, output: stdout };
	} catch (error) {
		return {
			ok: false,
			output: `${error.stdout ?? ""}${error.stderr ?? ""}` || String(error),
		};
	}
}

function writeFixture(name, files) {
	mkdirSync(fixtureParent, { recursive: true });
	const root = mkdtempSync(path.join(fixtureParent, `${name}-`));
	for (const [relativePath, contents] of Object.entries(files)) {
		const absolute = path.join(root, relativePath);
		mkdirSync(path.dirname(absolute), { recursive: true });
		writeFileSync(absolute, contents);
	}
	return root;
}

describe("check:package-internals", () => {
	const roots = [];

	beforeAll(() => () => {
		for (const root of roots) {
			rmSync(root, { recursive: true, force: true });
		}
	});

	function fixture(name, files) {
		const root = writeFixture(name, files);
		roots.push(root);
		return root;
	}

	it("fires on pathToFileURL into another package's src", () => {
		const root = fixture("file-url", {
			"scripts/ops.mjs": [
				'import { pathToFileURL } from "node:url";',
				'import { resolve } from "node:path";',
				`const url = pathToFileURL(resolve(process.cwd(), "${OTHER_PACKAGE_SRC}")).href;`,
				"await import(url);",
				"",
			].join("\n"),
		});

		const result = runChecker(root);
		expect(result.ok).toBe(false);
		expect(result.output).toContain(
			"resolves internal source of packages/data-plane/db",
		);
	});

	it("fires on an @afenda/<pkg>/src deep-import specifier", () => {
		const root = fixture("deep-specifier", {
			"scripts/consumer.ts": `import { client } from "${OTHER_PACKAGE_SPECIFIER}";\nexport { client };\n`,
		});

		const result = runChecker(root);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("deep-imports @afenda/db/src");
	});

	it("fires on subprocess execution of another package's source", () => {
		const root = fixture("subprocess", {
			"scripts/run.mjs": [
				'import { execFileSync } from "node:child_process";',
				`execFileSync("node", ["${OTHER_PACKAGE_SRC}"]);`,
				"",
			].join("\n"),
		});

		const result = runChecker(root);
		expect(result.ok).toBe(false);
		expect(result.output).toContain(
			"resolves internal source of packages/data-plane/db",
		);
	});

	it("stays silent when a package path is data, not a resolution target", () => {
		const root = fixture("scan-root", {
			"scripts/audit.mjs": [
				'import { readdirSync } from "node:fs";',
				`const SCAN_ROOT = "${OTHER_PACKAGE_SRC}";`,
				"console.log(SCAN_ROOT);",
				"readdirSync(SCAN_ROOT);",
				"",
			].join("\n"),
		});

		const result = runChecker(root);
		expect(result.ok).toBe(true);
		expect(result.output).toContain("check-package-internals: ok");
	});

	it("stays silent when a package resolves its own internal source", () => {
		const root = fixture("own-package", {
			"packages/data-plane/db/package.json": JSON.stringify({
				name: "@afenda/db",
			}),
			"packages/data-plane/db/scripts/build.mjs": [
				'import { pathToFileURL } from "node:url";',
				`await import(pathToFileURL("${OTHER_PACKAGE_SRC}").href);`,
				"",
			].join("\n"),
		});

		const result = runChecker(root);
		expect(result.ok).toBe(true);
	});
});
