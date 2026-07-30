import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

const SCRIPT_PATH = path.resolve("scripts/clean-workspace-noise.mjs");
const TEMP_ROOTS = [];
const DRY_RUN_PATTERN = /dry-run/;
const NODE_MODULES_REMOVAL_PATTERN = /Would remove node_modules/;
const TSBUILDINFO_REMOVAL_PATTERN =
	/Would remove packages\/example\/tsconfig\.tsbuildinfo/;
const LOG_REMOVAL_PATTERN = /Would remove debug\.log/;
const APPLY_PATTERN = /apply/;
const USAGE_PATTERN =
	/Usage: node scripts\/clean-workspace-noise\.mjs \[--apply\]/;

function createTempRepo() {
	const root = mkdtempSync(path.join(tmpdir(), "afenda-clean-noise-"));
	TEMP_ROOTS.push(root);

	execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
	writeFileSync(
		path.join(root, ".gitignore"),
		[
			"node_modules/",
			".turbo/",
			".next/",
			"coverage/",
			"test-results/",
			"playwright-report/",
			"storybook-static/",
			".tmp/",
			".playwright-cli/",
			".source/",
			"*.tsbuildinfo",
			"*.log",
			".env*",
			".vercel/",
			"_reference/",
			"apps/web/shadcn-studio/",
			"next-env.d.ts",
		].join("\n"),
	);

	return root;
}

async function createFile(root, relativePath, content = "x") {
	const absolutePath = path.join(root, relativePath);
	await mkdir(path.dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, content);
}

function runScript(root, args = []) {
	return execFileSync("node", [SCRIPT_PATH, ...args], {
		cwd: root,
		encoding: "utf8",
	});
}

afterEach(() => {
	for (const root of TEMP_ROOTS.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

describe("clean-workspace-noise", () => {
	it("dry-runs ignored allowlisted workspace noise without deleting it", async () => {
		const root = createTempRepo();
		await createFile(root, "node_modules/package/index.js");
		await createFile(root, "packages/example/tsconfig.tsbuildinfo");
		await createFile(root, "debug.log");

		const output = runScript(root);

		assert.match(output, DRY_RUN_PATTERN);
		assert.match(output, NODE_MODULES_REMOVAL_PATTERN);
		assert.match(output, TSBUILDINFO_REMOVAL_PATTERN);
		assert.match(output, LOG_REMOVAL_PATTERN);
		assert.equal(existsSync(path.join(root, "node_modules")), true);
		assert.equal(
			existsSync(path.join(root, "packages/example/tsconfig.tsbuildinfo")),
			true,
		);
	});

	it("applies only ignored allowlisted cleanup and preserves protected paths", async () => {
		const root = createTempRepo();
		await createFile(root, "node_modules/package/index.js");
		await createFile(root, "apps/web/.next/cache.bin");
		await createFile(root, "packages/example/tsconfig.tsbuildinfo");
		await createFile(root, "trace.log");
		await createFile(root, "dist/not-ignored.js");

		await createFile(root, ".env.local", "secret");
		await createFile(root, ".vercel/project.json", "{}");
		await createFile(root, "_reference/command.md", "# local");
		await createFile(root, "apps/web/shadcn-studio/components/button.tsx");
		await createFile(root, "next-env.d.ts", '/// <reference types="next" />');

		const output = runScript(root, ["--apply"]);

		assert.match(output, APPLY_PATTERN);
		assert.equal(existsSync(path.join(root, "node_modules")), false);
		assert.equal(existsSync(path.join(root, "apps/web/.next")), false);
		assert.equal(
			existsSync(path.join(root, "packages/example/tsconfig.tsbuildinfo")),
			false,
		);
		assert.equal(existsSync(path.join(root, "trace.log")), false);
		assert.equal(existsSync(path.join(root, "dist/not-ignored.js")), true);

		assert.equal(existsSync(path.join(root, ".env.local")), true);
		assert.equal(existsSync(path.join(root, ".vercel/project.json")), true);
		assert.equal(existsSync(path.join(root, "_reference/command.md")), true);
		assert.equal(
			existsSync(
				path.join(root, "apps/web/shadcn-studio/components/button.tsx"),
			),
			true,
		);
		assert.equal(existsSync(path.join(root, "next-env.d.ts")), true);
	});

	it("rejects unsupported arguments", () => {
		const root = createTempRepo();

		const result = spawnSync("node", [SCRIPT_PATH, "--force"], {
			cwd: root,
			encoding: "utf8",
		});

		assert.equal(result.status, 1);
		assert.match(result.stderr, USAGE_PATTERN);
	});
});
