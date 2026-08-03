/**
 * Negative fixtures for check:package-policy (ENV-GOV-1 slice C).
 *
 * The gate converts prose architecture claims into checked facts, so each claim
 * needs a fixture proving the check fires when the claim is false. The purity
 * case is the most important: it is the static counterpart to the package's
 * runtime import-isolation test, and it is what would catch a re-export of an
 * evaluator from the runtime barrel at review time rather than at runtime.
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
const checker = path.join(repoRoot, "scripts/check-package-policy.mts");
const tsxCli = path.join(repoRoot, "node_modules/tsx/dist/cli.mjs");
const fixtureParent = path.join(
	repoRoot,
	"node_modules/.cache/package-policy-fixtures",
);

const BASE_POLICY = {
	layer: "foundation",
	role: "leaf",
	permittedWorkspaceRuntimeDependencies: [],
	publicEntrypointKinds: {
		".": "runtime-product",
		"./contract": "pure-governance",
	},
	forbiddenImportPrefixes: ["@afenda/", "apps/"],
};

const BASE_EXPORTS = {
	".": { types: "./src/index.ts", default: "./src/index.ts" },
	"./contract": { types: "./src/contract.ts", default: "./src/contract.ts" },
};

/** A compliant package: runtime barrel impure, contract entrypoint pure. */
function baseFiles() {
	return {
		"package.json": JSON.stringify(
			{
				name: "@afenda/fixture",
				exports: BASE_EXPORTS,
				dependencies: { zod: "^3" },
			},
			null,
			2,
		),
		"src/package-policy.json": JSON.stringify(BASE_POLICY, null, 2),
		"src/index.ts": 'export { env } from "./web";\n',
		"src/web.ts": "export const env = { ok: true };\n",
		"src/contract.ts": 'export { evaluate } from "./evaluator";\n',
		"src/evaluator.ts": "export function evaluate() {\n\treturn true;\n}\n",
	};
}

function runChecker(packageRoot) {
	try {
		const stdout = execFileSync(
			process.execPath,
			[tsxCli, checker, "--package", packageRoot],
			{ cwd: repoRoot, encoding: "utf8", stdio: "pipe" },
		);
		return { ok: true, output: stdout };
	} catch (error) {
		return {
			ok: false,
			output: `${error.stdout ?? ""}${error.stderr ?? ""}` || String(error),
		};
	}
}

describe("check:package-policy", () => {
	const roots = [];

	beforeAll(() => () => {
		for (const root of roots) {
			rmSync(root, { recursive: true, force: true });
		}
	});

	function fixture(name, overrides = {}) {
		mkdirSync(fixtureParent, { recursive: true });
		const root = mkdtempSync(path.join(fixtureParent, `${name}-`));
		roots.push(root);
		const files = { ...baseFiles(), ...overrides };
		for (const [relativePath, contents] of Object.entries(files)) {
			if (contents === null) {
				continue;
			}
			const absolute = path.join(root, relativePath);
			mkdirSync(path.dirname(absolute), { recursive: true });
			writeFileSync(absolute, contents);
		}
		return root;
	}

	it("passes a compliant package", () => {
		const result = runChecker(fixture("compliant"));
		expect(result.ok).toBe(true);
		expect(result.output).toContain("check-package-policy: ok");
	});

	it("fires when a pure entrypoint reaches a runtime module", () => {
		// The defect this whole slice exists to prevent.
		const result = runChecker(
			fixture("impure-entrypoint", {
				"src/contract.ts":
					'export { evaluate } from "./evaluator";\nexport { env } from "./index";\n',
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain(
			'pure entrypoint "./contract" reaches runtime module',
		);
	});

	it("fires on an export not classified in policy", () => {
		const result = runChecker(
			fixture("unclassified-export", {
				"package.json": JSON.stringify({
					name: "@afenda/fixture",
					exports: {
						...BASE_EXPORTS,
						"./extra": {
							types: "./src/evaluator.ts",
							default: "./src/evaluator.ts",
						},
					},
					dependencies: { zod: "^3" },
				}),
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain('exports "./extra" is not classified');
	});

	it("fires when policy declares an entrypoint the package does not export", () => {
		const result = runChecker(
			fixture("phantom-entrypoint", {
				"src/package-policy.json": JSON.stringify({
					...BASE_POLICY,
					publicEntrypointKinds: {
						...BASE_POLICY.publicEntrypointKinds,
						"./recovery": "pure-governance",
					},
				}),
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain('policy declares "./recovery"');
	});

	it("fires when an export target does not exist on disk", () => {
		const result = runChecker(
			fixture("missing-target", { "src/contract.ts": null }),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("points at missing file");
	});

	it("fires when a leaf declares a workspace runtime dependency", () => {
		const result = runChecker(
			fixture("not-a-leaf", {
				"package.json": JSON.stringify({
					name: "@afenda/fixture",
					exports: BASE_EXPORTS,
					dependencies: { zod: "^3", "@afenda/db": "workspace:*" },
				}),
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain(
			"leaf package declares workspace runtime dependency @afenda/db",
		);
	});

	it("fires on a forbidden import prefix", () => {
		const result = runChecker(
			fixture("forbidden-prefix", {
				"src/evaluator.ts":
					'import { thing } from "@afenda/db";\nexport const evaluate = () => thing;\n',
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.output).toContain("imports forbidden prefix @afenda/");
	});
});
