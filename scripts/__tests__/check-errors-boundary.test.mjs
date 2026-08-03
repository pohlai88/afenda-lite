import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "vitest";

const scriptPath = resolve("scripts/check-errors-boundary.mjs");
const CHECK_OK_PATTERN = /check-errors-boundary: ok/u;
const COMPETING_APP_ERROR_PATTERN =
	/competing shared error-kernel definition: AppError/u;
const COMPETING_RESULT_PATTERN =
	/competing shared error-kernel definition: Result<T>/u;
const COMPETING_API_ERROR_CODES_PATTERN =
	/competing shared error-kernel definition: API_ERROR_CODES/u;
const COMPETING_API_ERROR_HTTP_STATUS_PATTERN =
	/competing shared error-kernel definition: API_ERROR_HTTP_STATUS/u;
const COMPETING_SERIALIZER_PATTERN =
	/competing shared error-kernel definition: serializeAppError/u;
const COMPETING_NORMALIZER_PATTERN =
	/competing shared error-kernel definition: normalizeUnknown/u;
const COMPETING_RETRY_PARSER_PATTERN =
	/competing shared error-kernel definition: retryAfterSeconds/u;
const COMPETING_POSTGRES_PARSER_PATTERN =
	/competing shared error-kernel definition: Postgres SQLSTATE parser/u;
const COMPETING_POSTGRES_MAPPER_PATTERN =
	/competing shared error-kernel definition: Postgres SQLSTATE mapper/u;
const COMPETING_POSTGRES_HELPER_PATTERN =
	/competing shared error-kernel definition: postgresSqlState/u;
const COMPETING_FAILURE_FACTORY_PATTERN =
	/competing shared error-kernel definition: shared failure factory/u;
const FORBIDDEN_DIRECT_IMPORT_PATTERN =
	/forbidden direct @afenda\/errors import/u;
const UNPUBLISHED_SUBPATH_PATTERN =
	/non-root @afenda\/errors import: @afenda\/errors\/core\/normalize/u;
const NON_ROOT_SUBPATH_PATTERN = /non-root @afenda\/errors import/u;
const STALE_DOCUMENTATION_PATTERN = /STALE_DOCUMENTATION/u;
const STALE_BRAND_PATTERN = /stale error brand or conversion helper/u;
const OBSOLETE_IMPORT_PATTERN = /obsolete internal @afenda\/errors import/u;
const RAW_SERIALIZATION_PATTERN = /direct public serialization of raw error/u;
const RAW_ERROR_THROW_PATTERN = /throwing raw Error across/u;

function createFixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-errors-consumption-"));
	mkdirSync(join(root, "apps"), { recursive: true });
	mkdirSync(join(root, "packages"), { recursive: true });
	return root;
}

function writeSource(root, relativePath, content) {
	const fullPath = join(root, relativePath);
	mkdirSync(join(fullPath, ".."), { recursive: true });
	writeFileSync(fullPath, content);
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

test("passes when only the errors kernel defines protected primitives", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/foundation/errors/src/core/app-error.ts",
			"export class AppError extends Error {}\n",
		);
		writeSource(
			root,
			"packages/erp/orders/src/index.ts",
			"export const value = 1;\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails competing shared error-kernel definitions outside the errors package", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/errors.ts",
			"export class AppError extends Error {}\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, COMPETING_APP_ERROR_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails competing result types outside the errors package", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/result.ts",
			"export type Result<T> = { ok: true; data: T } | { ok: false; error: string };\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, COMPETING_RESULT_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails competing error code and HTTP status registries", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/runtime/http/src/errors.ts",
			"export const API_ERROR_CODES = ['INTERNAL_ERROR'] as const;\nexport const API_ERROR_HTTP_STATUS = { INTERNAL_ERROR: 500 };\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, COMPETING_API_ERROR_CODES_PATTERN);
		assert.match(result.output, COMPETING_API_ERROR_HTTP_STATUS_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails competing serializers, normalizers, and retry parsers", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/runtime/http/src/error-wire.ts",
			"export function serializeAppError() {}\nexport function normalizeUnknown() {}\nexport function retryAfterSeconds() {}\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, COMPETING_SERIALIZER_PATTERN);
		assert.match(result.output, COMPETING_NORMALIZER_PATTERN);
		assert.match(result.output, COMPETING_RETRY_PARSER_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails competing Postgres SQLSTATE parser or mapper definitions", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/postgres-error.ts",
			"const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;\nconst SQLSTATE_MAP = {};\nfunction readSqlState() {}\nexport function postgresSqlState() {}\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, COMPETING_POSTGRES_PARSER_PATTERN);
		assert.match(result.output, COMPETING_POSTGRES_MAPPER_PATTERN);
		assert.match(result.output, COMPETING_POSTGRES_HELPER_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails competing exported shared failure factories", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/runtime/http/src/factories.ts",
			"import type { AppError } from '@afenda/errors';\nexport function badRequest(): AppError { throw new Error('fixture'); }\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, COMPETING_FAILURE_FACTORY_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("allows test-only fixture result aliases", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/__tests__/fixture.test.ts",
			"export type Result<T> = { value: T };\n",
		);

		const result = runCheck(root);

		assert.equal(result.status, 0);
		assert.match(result.output, CHECK_OK_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails forbidden direct errors imports in schema hosts", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/data-plane/db/src/schema/users.ts",
			'import type { ErrorCode } from "@afenda/errors";\nexport type Code = ErrorCode;\n',
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, FORBIDDEN_DIRECT_IMPORT_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails unpublished @afenda/errors subpath imports", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/index.ts",
			'import { normalizeUnknown } from "@afenda/errors/core/normalize";\n',
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, UNPUBLISHED_SUBPATH_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails every non-root @afenda/errors import", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/index.ts",
			[
				'import type { Result } from "@afenda/errors/result";',
				'import { httpErrorBody } from "@afenda/errors/http";',
				'import { badRequest } from "@afenda/errors/common";',
				'import { normalizePostgresUnknown } from "@afenda/errors/adapters/postgres";',
				"export const value: Result<string> = { ok: true, data: String(httpErrorBody) + String(badRequest) + String(normalizePostgresUnknown) };",
			].join("\n"),
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, NON_ROOT_SUBPATH_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails stale errors documentation patterns", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"docs-V2/api/errors.md",
			[
				"Import `asErrorCode` from `@afenda/errors/core/codes`.",
				"At public service boundary, throw new Error when the operation fails.",
				"Return `Response.json(error)` from a route handler.",
			].join("\n"),
		);

		const result = runCheck(root);

		assert.equal(result.status, 1);
		assert.match(result.output, STALE_DOCUMENTATION_PATTERN);
		assert.match(result.output, STALE_BRAND_PATTERN);
		assert.match(result.output, OBSOLETE_IMPORT_PATTERN);
		assert.match(result.output, RAW_SERIALIZATION_PATTERN);
		assert.match(result.output, RAW_ERROR_THROW_PATTERN);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
