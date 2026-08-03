/**
 * @afenda/config repository boundary fixtures
 * Contract: packages/foundation/config/CONTRACT.md
 * Protected: changes require the local pre-edit token and a contract amendment.
 *
 * One negative fixture per invariant, plus a positive baseline.
 *
 * An invariant with no failing fixture is an invariant nobody has proven is
 * enforced — INV-10 keeps the contract and the checker in step, and this file
 * keeps each assertion honest about what it actually rejects.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "vitest";

import { checkConfigBoundary } from "../scripts/check-config-boundary.mjs";

const EXPORTS = {
	"./biome.json": "./biome.json",
	"./tsconfig/base.json": "./tsconfig/base.json",
	"./tsconfig/nextjs.json": "./tsconfig/nextjs.json",
	"./tsconfig/node-library.json": "./tsconfig/node-library.json",
	"./tsconfig/react-library.json": "./tsconfig/react-library.json",
};

const BASE_PROFILE = {
	compilerOptions: {
		target: "ES2022",
		lib: ["ES2022"],
		types: [],
		strict: true,
	},
	exclude: ["**/node_modules", "**/dist"],
};

const CONFIG_DIR = "packages/foundation/config";

/** Mirrors the real contract closely enough to satisfy INV-10. */
const CONTRACT = `# contract
| ID | Invariant |
|----|-----------|
| **INV-1** | no root export |
| **INV-2** | export targets exist |
| **INV-3** | devDependencies only |
| **INV-4** | no runtime import |
| **INV-5** | extends specifiers are exports |
| **INV-6** | governed options |
| **INV-7** | glob-form excludes |
| **INV-8** | no baseUrl |
| **INV-9** | one profile per package |
| **INV-10** | contract and implementation agree |
`;

function write(root, relativePath, contents) {
	const file = join(root, relativePath);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(
		file,
		typeof contents === "string"
			? contents
			: `${JSON.stringify(contents, null, "\t")}\n`,
	);
}

/** A repository that satisfies every invariant. Each test breaks exactly one. */
function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-config-boundary-"));

	write(root, "pnpm-workspace.yaml", "packages:\n  - packages/*/*\n");
	write(root, `${CONFIG_DIR}/package.json`, {
		name: "@afenda/config",
		exports: EXPORTS,
	});
	write(root, `${CONFIG_DIR}/CONTRACT.md`, CONTRACT);
	write(root, `${CONFIG_DIR}/biome.json`, { root: false });
	write(root, `${CONFIG_DIR}/tsconfig/base.json`, BASE_PROFILE);
	write(root, `${CONFIG_DIR}/tsconfig/node-library.json`, {
		extends: "./base.json",
		compilerOptions: { types: ["node"] },
	});
	write(root, `${CONFIG_DIR}/tsconfig/react-library.json`, {
		extends: "./base.json",
		compilerOptions: { lib: ["DOM", "ES2022"], types: ["react", "react-dom"] },
	});
	write(root, `${CONFIG_DIR}/tsconfig/nextjs.json`, {
		extends: "./react-library.json",
		compilerOptions: { allowJs: true },
	});

	write(root, "apps/web/package.json", { name: "@afenda/web" });
	write(root, "apps/web/tsconfig.json", {
		extends: "@afenda/config/tsconfig/nextjs.json",
		compilerOptions: { rootDir: "." },
	});

	write(root, "packages/runtime/logger/package.json", {
		name: "@afenda/logger",
		devDependencies: { "@afenda/config": "workspace:*" },
	});
	write(root, "packages/runtime/logger/tsconfig.json", {
		extends: "@afenda/config/tsconfig/node-library.json",
		compilerOptions: { rootDir: "src" },
	});

	return root;
}

function run(root) {
	try {
		return checkConfigBoundary(root);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

/** Asserts exactly the expected invariant fired, and nothing else. */
function assertOnly(violations, invariant) {
	assert.ok(
		violations.length > 0,
		`expected ${invariant} to fire, but the fixture was clean`,
	);
	for (const violation of violations) {
		assert.ok(
			violation.startsWith(`${invariant} `),
			`expected only ${invariant}, got: ${violation}`,
		);
	}
}

test("baseline: a conforming repository has no violations", () => {
	assert.deepEqual(run(fixture()), []);
});

test("INV-1 rejects a root export", () => {
	const root = fixture();
	write(root, `${CONFIG_DIR}/package.json`, {
		name: "@afenda/config",
		exports: { ".": "./src/index.ts", ...EXPORTS },
	});
	assertOnly(run(root), "INV-1");
});

test("INV-1 rejects a src/ tree", () => {
	const root = fixture();
	write(root, `${CONFIG_DIR}/src/index.ts`, "export {};\n");
	assertOnly(run(root), "INV-1");
});

test("INV-2 rejects the extensionless Biome alias", () => {
	const root = fixture();
	write(root, `${CONFIG_DIR}/package.json`, {
		name: "@afenda/config",
		exports: { ...EXPORTS, "./biome": "./biome.json" },
	});
	assertOnly(run(root), "INV-2");
});

test("INV-2 rejects an export with no file on disk", () => {
	const root = fixture();
	write(root, `${CONFIG_DIR}/package.json`, {
		name: "@afenda/config",
		exports: { ...EXPORTS, "./tsconfig/ghost.json": "./tsconfig/ghost.json" },
	});
	assertOnly(run(root), "INV-2");
});

test("INV-3 rejects runtime dependency placement", () => {
	const root = fixture();
	write(root, "apps/web/package.json", {
		name: "@afenda/web",
		dependencies: { "@afenda/config": "workspace:*" },
	});
	assertOnly(run(root), "INV-3");
});

test("INV-4 rejects a runtime import", () => {
	const root = fixture();
	write(
		root,
		"apps/web/source.ts",
		'import config from "@afenda/config";\nvoid config;\n',
	);
	assertOnly(run(root), "INV-4");
});

test("INV-4 permits the import in a *.config.* file", () => {
	const root = fixture();
	write(root, "apps/web/vite.config.ts", 'import "@afenda/config";\n');
	assert.deepEqual(run(root), []);
});

test("INV-5 rejects an extends specifier that is not a declared export", () => {
	const root = fixture();
	write(root, "packages/runtime/logger/tsconfig.json", {
		extends: "@afenda/config/tsconfig/invented.json",
		compilerOptions: { rootDir: "src" },
	});
	// Also trips INV-9, which is the point: an undeclared profile is not the
	// zone's profile either.
	assert.ok(run(root).some((violation) => violation.startsWith("INV-5 ")));
});

test("INV-6 rejects redeclaring a governed option", () => {
	const root = fixture();
	write(root, "packages/runtime/logger/tsconfig.json", {
		extends: "@afenda/config/tsconfig/node-library.json",
		compilerOptions: { rootDir: "src", strict: false },
	});
	assertOnly(run(root), "INV-6");
});

test("INV-6 rejects narrowing types", () => {
	const root = fixture();
	write(root, "apps/web/tsconfig.json", {
		extends: "@afenda/config/tsconfig/nextjs.json",
		compilerOptions: { rootDir: ".", types: ["node"] },
	});
	assertOnly(run(root), "INV-6");
});

test("INV-6 permits widening types", () => {
	const root = fixture();
	write(root, "apps/web/tsconfig.json", {
		extends: "@afenda/config/tsconfig/nextjs.json",
		compilerOptions: { rootDir: ".", types: ["react", "react-dom", "node"] },
	});
	assert.deepEqual(run(root), []);
});

test("INV-6 rejects dropping a non-ES lib entry", () => {
	const root = fixture();
	write(root, "apps/web/tsconfig.json", {
		extends: "@afenda/config/tsconfig/nextjs.json",
		compilerOptions: { rootDir: ".", lib: ["ES2022"] },
	});
	assertOnly(run(root), "INV-6");
});

test("INV-6 treats a higher ES lib year as subsuming a lower one", () => {
	const root = fixture();
	write(root, "packages/runtime/logger/tsconfig.json", {
		extends: "@afenda/config/tsconfig/node-library.json",
		compilerOptions: { rootDir: "src", lib: ["ES2023"] },
	});
	assert.deepEqual(run(root), []);
});

test("INV-6 rejects a lower ES lib year", () => {
	const root = fixture();
	write(root, "packages/runtime/logger/tsconfig.json", {
		extends: "@afenda/config/tsconfig/node-library.json",
		compilerOptions: { rootDir: "src", lib: ["ES2021"] },
	});
	assertOnly(run(root), "INV-6");
});

test("INV-6 scopes governance to the profile the consumer extends", () => {
	// allowJs is set by nextjs.json only. A node-library consumer setting it is
	// not overriding anything it inherits.
	const root = fixture();
	write(root, "packages/runtime/logger/tsconfig.json", {
		extends: "@afenda/config/tsconfig/node-library.json",
		compilerOptions: { rootDir: "src", allowJs: true },
	});
	assert.deepEqual(run(root), []);
});

test("INV-7 rejects a non-glob base exclude", () => {
	const root = fixture();
	write(root, `${CONFIG_DIR}/tsconfig/base.json`, {
		...BASE_PROFILE,
		exclude: ["node_modules"],
	});
	assertOnly(run(root), "INV-7");
});

test("INV-8 rejects baseUrl", () => {
	const root = fixture();
	write(root, "packages/runtime/logger/tsconfig.json", {
		extends: "@afenda/config/tsconfig/node-library.json",
		compilerOptions: { rootDir: "src", baseUrl: "." },
	});
	assertOnly(run(root), "INV-8");
});

test("INV-9 rejects the wrong profile for a zone", () => {
	const root = fixture();
	write(root, "apps/web/tsconfig.json", {
		extends: "@afenda/config/tsconfig/base.json",
		compilerOptions: { rootDir: "." },
	});
	assertOnly(run(root), "INV-9");
});

test("INV-9 rejects a package with no tsconfig.json", () => {
	const root = fixture();
	rmSync(join(root, "packages/runtime/logger/tsconfig.json"));
	assertOnly(run(root), "INV-9");
});

test("INV-9 honours the named exceptions", () => {
	const root = fixture();
	write(root, "packages/foundation/errors/package.json", {
		name: "@afenda/errors",
	});
	write(root, "packages/foundation/errors/tsconfig.json", {
		extends: "@afenda/config/tsconfig/base.json",
		compilerOptions: { rootDir: "src" },
	});
	assert.deepEqual(run(root), []);
});

test("INV-10 rejects an invariant documented but not asserted", () => {
	const root = fixture();
	write(
		root,
		`${CONFIG_DIR}/CONTRACT.md`,
		`${CONTRACT}| **INV-11** | invented |\n`,
	);
	assertOnly(run(root), "INV-10");
});

test("INV-10 rejects a missing contract", () => {
	const root = fixture();
	rmSync(join(root, CONFIG_DIR, "CONTRACT.md"));
	assertOnly(run(root), "INV-10");
});
