import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";

import { checkAppLoaderServerSuffix } from "../check-app-loader-server-suffix.mjs";

function createFixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-loader-suffix-"));
	mkdirSync(join(root, "apps/web/features/demo"), { recursive: true });
	return root;
}

test("passes when loaders use the .server.ts suffix", () => {
	const root = createFixture();
	try {
		writeFileSync(
			join(root, "apps/web/features/demo/load-demo.server.ts"),
			"export async function loadDemo() { return null; }\n",
		);
		assert.deepEqual(checkAppLoaderServerSuffix(root), { ok: true });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails when a feature load-*.ts omits .server.ts", () => {
	const root = createFixture();
	try {
		writeFileSync(
			join(root, "apps/web/features/demo/load-demo.ts"),
			"export async function loadDemo() { return null; }\n",
		);
		const result = checkAppLoaderServerSuffix(root);
		assert.equal(result.ok, false);
		assert.ok(
			result.files.some((file) =>
				file.endsWith("apps/web/features/demo/load-demo.ts"),
			),
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("passes when features directory is absent", () => {
	const root = mkdtempSync(join(tmpdir(), "afenda-loader-suffix-empty-"));
	try {
		assert.deepEqual(checkAppLoaderServerSuffix(root), { ok: true });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
