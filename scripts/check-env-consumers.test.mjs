import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const scriptPath = resolve("scripts/check-env-consumers.mjs");
const CHECK_OK_PATTERN = /check-env-consumers: ok/u;
const RAW_PROCESS_ENV_PATTERN = /RAW_PROCESS_ENV/u;
const UPSTASH_URL_PATTERN = /UPSTASH_REDIS_REST_URL/u;
const COMPETING_CREATE_ENV_PATTERN = /COMPETING_CREATE_ENV/u;
const RUNTIME_ENV_LOADER_PATTERN = /RUNTIME_ENV_LOADER/u;
const LEGACY_ENV_ALIAS_PATTERN = /LEGACY_ENV_ALIAS/u;
const COMMITTED_ENV_FILE_PATTERN = /COMMITTED_ENV_FILE/u;
const LOCAL_ENV_FILE_PATTERN = /\.env\.local/u;
const DOCS_PRODUCT_ENV_IMPORT_PATTERN = /DOCS_PRODUCT_ENV_IMPORT/u;

function createFixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-env-consumers-"));
	mkdirSync(join(root, "apps"), { recursive: true });
	mkdirSync(join(root, "packages"), { recursive: true });
	mkdirSync(join(root, "scripts"), { recursive: true });
	mkdirSync(join(root, "testing"), { recursive: true });
	return root;
}

function writeSource(root, relativePath, content) {
	const fullPath = join(root, relativePath);
	mkdirSync(join(fullPath, ".."), { recursive: true });
	writeFileSync(fullPath, content);
}

function initGitRepo(root) {
	execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
	execFileSync("git", ["config", "user.email", "test@example.com"], {
		cwd: root,
		stdio: "ignore",
	});
	execFileSync("git", ["config", "user.name", "Test"], {
		cwd: root,
		stdio: "ignore",
	});
}

function runCheck(root) {
	try {
		const stdout = execFileSync("node", [scriptPath], {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { status: 0, output: stdout };
	} catch (error) {
		return {
			status: error.status,
			output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
		};
	}
}

test("allows process.env reads inside @afenda/env authority", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/foundation/env/src/web.ts",
			"export const runtimeEnv = { APP_URL: process.env.APP_URL };\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails raw product runtime process.env reads", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/runtime/cache/src/resolve.ts",
			"export const url = process.env.UPSTASH_REDIS_REST_URL;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, RAW_PROCESS_ENV_PATTERN);
		assert.match(result.output, UPSTASH_URL_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("allows documented DB bootstrap exception", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/data-plane/db/src/env.ts",
			"export const databaseUrl = process.env.DATABASE_URL;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("allows scripts and framework config env reads", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"scripts/validate-neon-env.mjs",
			"const key = process.env.NEON_API_KEY;\n",
		);
		writeSource(
			root,
			"apps/web/next.config.ts",
			"import { loadEnvConfig } from '@next/env';\nexport const dev = process.env.NODE_ENV === 'development';\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails competing createEnv outside @afenda/env", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/runtime/cache/src/env.ts",
			"import { createEnv } from '@t3-oss/env-nextjs';\nexport const cacheEnv = createEnv({ server: {}, runtimeEnv: {} });\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, COMPETING_CREATE_ENV_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails runtime dotenv imports", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/control-plane/auth/src/env.ts",
			"import dotenv from 'dotenv';\ndotenv.config();\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, RUNTIME_ENV_LOADER_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails legacy environment aliases in runtime code", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/web/app/actions/database.ts",
			"export const key = 'POSTGRES_PRISMA_URL';\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, LEGACY_ENV_ALIAS_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails committed local env files", () => {
	const root = createFixture();
	try {
		initGitRepo(root);
		writeSource(root, ".env.example", "APP_URL=https://example.com\n");
		writeSource(root, ".env.local", "APP_URL=https://secret.example.com\n");
		execFileSync("git", ["add", ".env.example", ".env.local"], {
			cwd: root,
			stdio: "ignore",
		});

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, COMMITTED_ENV_FILE_PATTERN);
		assert.match(result.output, LOCAL_ENV_FILE_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("allows only docs env imports in docs app runtime", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/docs/lib/source.ts",
			"import { docsEnv } from '@afenda/env/docs';\nexport const url = docsEnv.DOCS_URL;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails product env imports in docs app runtime", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/docs/lib/source.ts",
			"import { env } from '@afenda/env';\nexport const url = env.APP_URL;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, DOCS_PRODUCT_ENV_IMPORT_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
