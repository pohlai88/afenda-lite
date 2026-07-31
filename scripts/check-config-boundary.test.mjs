import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkConfigBoundary } from "./check-config-boundary.mjs";

const PERMANENT_EXPORTS = {
	"./biome.json": "./biome.json",
	"./tsconfig/base.json": "./tsconfig/base.json",
	"./tsconfig/nextjs.json": "./tsconfig/nextjs.json",
	"./tsconfig/node-library.json": "./tsconfig/node-library.json",
	"./tsconfig/react-library.json": "./tsconfig/react-library.json",
};

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-config-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/foundation/config"), { recursive: true });
	writeFileSync(
		join(root, "packages/foundation/config/package.json"),
		`${JSON.stringify({ name: "@afenda/config", exports: PERMANENT_EXPORTS })}\n`,
	);
	writeFileSync(join(root, "apps/web/package.json"), "{}\n");
	return root;
}

function dispose(root) {
	rmSync(root, { recursive: true, force: true });
}

test("accepts tooling-only config consumption", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkConfigBoundary(root), []);
	} finally {
		dispose(root);
	}
});

test("rejects the deleted extensionless Biome alias", () => {
	const root = fixture();
	try {
		const packageFile = join(root, "packages/foundation/config/package.json");
		writeFileSync(
			packageFile,
			`${JSON.stringify({ exports: { ...PERMANENT_EXPORTS, "./biome": "./biome.json" } })}\n`,
		);
		assert.ok(
			checkConfigBoundary(root).some((violation) =>
				violation.includes("prohibited export ./biome"),
			),
		);
	} finally {
		dispose(root);
	}
});

test("rejects runtime imports", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "apps/web/source.ts"),
			'import config from "@afenda/config";\nvoid config;\n',
		);
		assert.ok(
			checkConfigBoundary(root).some((violation) =>
				violation.includes("runtime @afenda/config reference"),
			),
		);
	} finally {
		dispose(root);
	}
});

test("rejects runtime dependency placement", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "apps/web/package.json"),
			`${JSON.stringify({ dependencies: { "@afenda/config": "workspace:*" } })}\n`,
		);
		assert.ok(
			checkConfigBoundary(root).some((violation) =>
				violation.includes("must be a devDependency"),
			),
		);
	} finally {
		dispose(root);
	}
});
