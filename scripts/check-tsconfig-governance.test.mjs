import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkTsconfigGovernance } from "./check-tsconfig-governance.mjs";

const roots = [];

function writeJson(root, relativeFile, value) {
	const file = join(root, relativeFile);
	mkdirSync(join(file, ".."), { recursive: true });
	writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-tsconfig-governance-"));
	roots.push(root);
	const presetRoot = "packages/foundation/config/tsconfig";
	writeJson(root, `${presetRoot}/base.json`, {
		compilerOptions: {
			target: "ES2022",
			lib: ["ES2022"],
			module: "preserve",
			moduleResolution: "bundler",
			moduleDetection: "force",
			types: [],
			strict: true,
			exactOptionalPropertyTypes: true,
			noUncheckedIndexedAccess: true,
			noImplicitOverride: true,
			noUncheckedSideEffectImports: true,
			isolatedModules: true,
			verbatimModuleSyntax: true,
			noEmit: true,
		},
	});
	writeJson(root, `${presetRoot}/node-library.json`, {
		extends: "./base.json",
		compilerOptions: { types: ["node"] },
	});
	writeJson(root, `${presetRoot}/react-library.json`, {
		extends: "./base.json",
		compilerOptions: {
			lib: ["DOM", "DOM.Iterable", "ES2022"],
			jsx: "react-jsx",
			types: ["react", "react-dom"],
		},
	});
	writeJson(root, `${presetRoot}/nextjs.json`, {
		extends: "./react-library.json",
		compilerOptions: {
			allowJs: true,
			plugins: [{ name: "next" }],
			types: ["node", "react", "react-dom"],
		},
	});
	writeJson(root, "packages/foundation/config/package.json", {
		exports: {
			"./tsconfig/base.json": "./tsconfig/base.json",
			"./tsconfig/node-library.json": "./tsconfig/node-library.json",
			"./tsconfig/react-library.json": "./tsconfig/react-library.json",
			"./tsconfig/nextjs.json": "./tsconfig/nextjs.json",
		},
	});
	writeJson(root, "packages/example/tsconfig.json", {
		extends: "@afenda/config/tsconfig/node-library.json",
		compilerOptions: { rootDir: "src" },
		include: ["src/**/*.ts"],
	});
	return root;
}

afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

describe("checkTsconfigGovernance", () => {
	it("accepts approved shared presets with package-owned deltas", () => {
		const root = createFixture();
		expect(checkTsconfigGovernance(root)).toEqual([]);
	});

	it("rejects duplicated central compiler options", () => {
		const root = createFixture();
		writeJson(root, "packages/example/tsconfig.json", {
			extends: "@afenda/config/tsconfig/node-library.json",
			compilerOptions: { strict: false },
		});
		expect(checkTsconfigGovernance(root)).toContain(
			"packages/example/tsconfig.json: compilerOptions.strict belongs in @afenda/config",
		);
	});

	it("rejects unapproved extends chains", () => {
		const root = createFixture();
		writeJson(root, "packages/example/tsconfig.json", {
			extends: "@vendor/tsconfig/base.json",
		});
		expect(checkTsconfigGovernance(root)).toContain(
			"packages/example/tsconfig.json: extends chain must resolve to an approved @afenda/config preset",
		);
	});
});
