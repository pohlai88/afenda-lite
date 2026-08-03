import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "vitest";

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

/* ------------------------------------------------------------------------ */
/* AST-only detections (ENV-GOV-1 B).                                        */
/*                                                                            */
/* Each case below is a form the previous regex checker could not see. They   */
/* matter because a regex gate fails silently: the pattern stops matching,    */
/* the gate still exits 0, and coverage disappears with no signal.            */
/* ------------------------------------------------------------------------ */

const ENV_VALIDATION_BYPASS_PATTERN = /ENV_VALIDATION_BYPASS/u;

test("detects destructured process.env reads", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/sales/src/config.ts",
			"const { DATABASE_URL } = process.env;\nexport const url = DATABASE_URL;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, RAW_PROCESS_ENV_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("detects aliased process.env reads", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/sales/src/config.ts",
			"const environment = process.env;\nexport const url = environment.DATABASE_URL;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, RAW_PROCESS_ENV_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("detects whole-object process.env escape", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/sales/src/config.ts",
			"export const snapshot = Object.freeze(process.env);\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, RAW_PROCESS_ENV_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("ignores process.env mentioned only in comments", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/sales/src/config.ts",
			"// Never read process.env.DATABASE_URL here.\n/* process.env.APP_URL is also forbidden. */\nexport const ok = true;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("detects docs product env import via dynamic import", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/docs/lib/source.ts",
			"export async function load() {\n\treturn await import('@afenda/env');\n}\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, DOCS_PRODUCT_ENV_IMPORT_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("detects docs product env import via re-export", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/docs/lib/source.ts",
			"export * from '@afenda/env';\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, DOCS_PRODUCT_ENV_IMPORT_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("detects env loader required at runtime", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/sales/src/boot.cjs",
			"const dotenv = require('dotenv');\nmodule.exports = dotenv;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, RUNTIME_ENV_LOADER_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("restricts SKIP_ENV_VALIDATION to named owners", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/sales/src/config.ts",
			"export const skip = process.env.SKIP_ENV_VALIDATION === 'true';\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, ENV_VALIDATION_BYPASS_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("allows SKIP_ENV_VALIDATION inside the env authority suite", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/foundation/env/__tests__/env.test.ts",
			"process.env.SKIP_ENV_VALIDATION = 'true';\nexport const ok = true;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("scopes platform identity keys to approved consumer categories", () => {
	const root = createFixture();
	try {
		// Framework configuration legitimately branches on build mode.
		writeSource(
			root,
			"apps/web/next.config.ts",
			"export default { output: process.env.NODE_ENV === 'production' ? 'export' : undefined };\n",
		);

		const frameworkConfig = runCheck(root);
		assert.equal(frameworkConfig.status, 0);
		assert.match(frameworkConfig.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects platform identity keys inside business packages", () => {
	const root = createFixture();
	try {
		// NODE_ENV is platform context, but branching on it throughout business
		// code is the drift a globally unconditional allowlist would permit.
		writeSource(
			root,
			"packages/erp/sales/src/mode.ts",
			"export const isProd = process.env.NODE_ENV === 'production';\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, RAW_PROCESS_ENV_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects product configuration reads anywhere in business packages", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/sales/src/db.ts",
			"export const url = process.env.DATABASE_URL;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, RAW_PROCESS_ENV_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("treats whole-object capture as a violation, not just key access", () => {
	const root = createFixture();
	try {
		// Capturing the object is forbidden at the point of capture, which is why
		// single-level alias tracking is sufficient: longer chains and factory
		// functions are already caught here.
		writeSource(
			root,
			"packages/erp/sales/src/capture.ts",
			"const source = process.env;\nexport function getEnv() {\n\treturn source;\n}\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, RAW_PROCESS_ENV_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
