import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
	buildErrorsNormalizationReport,
	formatHumanReport,
	parseOutputFormat,
} from "./check-errors-semantics.mjs";

const CHECK_OK_PATTERN = /check-errors-semantics: ok/u;

function createFixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-errors-normalization-"));
	mkdirSync(join(root, "apps"), { recursive: true });
	mkdirSync(join(root, "packages"), { recursive: true });
	return root;
}

function writeSource(root, relativePath, content) {
	const fullPath = join(root, relativePath);
	mkdirSync(join(fullPath, ".."), { recursive: true });
	writeFileSync(fullPath, content);
}

test("accepts canonical Postgres normalization", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/store.ts",
			`
				import { normalizePostgresUnknown } from "@afenda/errors/adapters/postgres";
				import { failFromAppError } from "@afenda/errors/result";
				export function map(error) {
					return failFromAppError(normalizePostgresUnknown(error, "Save record"));
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root, strict: true });

		assert.equal(report.summary.status, "ok");
		assert.equal(report.summary.canonical, 1);
		assert.equal(report.summary.postgresMappingDrift, 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails infrastructure guessing inside core normalizeUnknown", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/foundation/errors/src/core/normalize.ts",
			`
				import { normalizePostgresUnknown } from "../adapters/postgres";
				export function normalizeUnknown(error) {
					return normalizePostgresUnknown(error);
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.infrastructureGuessing, 1);
		assert.equal(
			report.infrastructureGuessing[0]?.file,
			"packages/foundation/errors/src/core/normalize.ts",
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails manual AppError-to-Result copying", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/store.ts",
			`
				import { normalizePostgresUnknown } from "@afenda/errors/adapters/postgres";
				import { fail } from "@afenda/errors/result";
				export function map(error) {
					const mapped = normalizePostgresUnknown(error, "Save record");
					return fail(mapped.code, mapped.message, mapped.details);
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.manualResultConstruction, 1);
		assert.equal(report.summary.postgresMappingDrift, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails raw unknown error leaks", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/runtime/cache/src/loader.ts",
			`
				import type { Result } from "@afenda/errors/result";
				export function leak(error) {
					return error instanceof Error ? error.message : String(error);
				}
				export type LoaderResult = Result<string>;
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.rawErrorLeaks, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails raw unknown error wrapping without an errors import", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/runtime/cache/src/loader.ts",
			`
				export function leak(error) {
					return new Error(String(error));
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.rawErrorLeaks, 1);
		assert.equal(
			report.partial[0]?.file,
			"packages/runtime/cache/src/loader.ts",
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails public client raw error message fallback without an errors import", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/docs/components/feedback/client.tsx",
			`
				export function message(error) {
					return error instanceof Error ? error.message : "Failed";
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.rawErrorLeaks, 1);
		assert.equal(
			report.partial[0]?.file,
			"apps/docs/components/feedback/client.tsx",
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("allows private local Error and domain-local outcome shapes", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/domain/value-object.ts",
			`
				type LocalParseResult =
					| { ok: true; value: string }
					| { ok: false; reason: "EMPTY" | "TOO_LONG" };

				function assertNonBlank(value: string): void {
					if (value.trim().length === 0) {
						throw new Error("Value must not be blank");
					}
				}

				export function parseLocalValue(value: string): LocalParseResult {
					if (value.length === 0) return { ok: false, reason: "EMPTY" };
					if (value.length > 20) return { ok: false, reason: "TOO_LONG" };
					assertNonBlank(value);
					return { ok: true, value };
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root, strict: true });

		assert.equal(report.summary.status, "ok");
		assert.equal(report.summary.files, 0);
		assert.equal(report.summary.partial, 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails manual serialization and local HTTP projection drift", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/web/app/api/example/route.ts",
			`
				import type { AppError } from "@afenda/errors";
				const ERROR_HTTP_STATUS = { INTERNAL_ERROR: 500 };
				export function GET(error: AppError) {
					return Response.json(error);
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.manualSerialization, 1);
		assert.equal(report.summary.httpProjectionDrift, 1);
		assert.equal(report.manualSerialization[0]?.auditCategory, "UNSAFE");
		assert.equal(report.httpProjectionDrift[0]?.auditCategory, "INCONSISTENT");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails manual numeric HTTP status with error body projection", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/web/app/api/example/route.ts",
			`
				import { ERROR_HTTP_STATUS, httpErrorBody } from "@afenda/errors/http";
				export function GET() {
					const code = "INTERNAL_ERROR";
					return Response.json(
						httpErrorBody(code, "Failed"),
						{ status: ERROR_HTTP_STATUS[code] },
					);
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "ok");
		assert.equal(report.summary.httpProjectionDrift, 0);

		writeSource(
			root,
			"apps/web/app/api/manual/route.ts",
			`
				export function GET() {
					return Response.json(
						{ error: { code: "INTERNAL_ERROR", message: "Failed" } },
						{ status: 500 },
					);
				}
			`,
		);

		const driftReport = buildErrorsNormalizationReport({ root });

		assert.equal(driftReport.summary.status, "fail");
		assert.equal(driftReport.summary.httpProjectionDrift, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails manual AppError field projection at public boundaries", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/web/modules/platform/api/json-response.ts",
			`
				import type { AppError } from "@afenda/errors";
				import { httpErrorBody } from "@afenda/errors/http";
				export function jsonAppError(error: AppError) {
					return Response.json(httpErrorBody(error.code, error.message, error.details));
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.canonicalSerializationDrift, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("accepts AppError serialization helpers that delegate to serializeAppError", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/web/modules/platform/api/json-response.ts",
			`
				import type { AppError } from "@afenda/errors";
				import { projectHttpError } from "@afenda/errors/http";
				export function jsonAppError(error: AppError) {
					const projection = projectHttpError(error);
					return Response.json(projection.body, { status: projection.status });
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root, strict: true });

		assert.equal(report.summary.status, "ok");
		assert.equal(report.summary.canonicalSerializationDrift, 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails raw error object projection", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/web/app/api/example/route.ts",
			`
				export function GET(error) {
					return { error };
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.manualSerialization, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails raw error message in failure envelope", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/web/app/actions/example.ts",
			`
				export function action(error) {
					return { ok: false, message: error.message };
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.rawErrorLeaks, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails public response bodies that expose internals", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/web/app/api/example/route.ts",
			`
				export function GET(error) {
					return Response.json({ stack: error.stack, cause: error.cause });
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.manualSerialization, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails swallowed unknown catch fallbacks", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/store.ts",
			`
				export function load() {
					try {
						return ["value"];
					} catch (error) {
						void error;
						return [];
					}
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.swallowedUnknownCatch, 1);
		assert.equal(report.swallowedUnknownCatch[0]?.auditCategory, "UNSAFE");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails unsafe details passthrough and direct AppError UI exposure", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"apps/web/features/example/error-panel.tsx",
			`
				import type { AppError } from "@afenda/errors";
				type Props = { error: AppError };
				export function ErrorPanel(props: Props) {
					return <p>{props.error.message}</p>;
				}
			`,
		);
		writeSource(
			root,
			"packages/erp/orders/src/store.ts",
			`
				import { fail } from "@afenda/errors/result";
				export function map(error) {
					return fail("INTERNAL_ERROR", "Failed", { details: error });
				}
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.directAppErrorUiExposure, 1);
		assert.equal(report.summary.unsafeDetailsPassthrough, 1);
		assert.equal(report.directAppErrorUiExposure[0]?.auditCategory, "UNSAFE");
		assert.equal(report.unsafeDetailsPassthrough[0]?.auditCategory, "UNSAFE");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails inconsistent mapping and classification drift", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/errors.ts",
			`
				import { fail } from "@afenda/errors/result";
				import { badRequest } from "@afenda/errors";
				export const missing = fail("INTERNAL_ERROR", "Customer not found");
				export const config = badRequest("DATABASE_URL is missing");
			`,
		);
		writeSource(
			root,
			"packages/erp/orders/src/app-error.ts",
			`
				import { AppError } from "@afenda/errors";
				export const defect = new AppError({
					code: "INTERNAL_ERROR",
					message: "Failed",
					isOperational: true,
				});
			`,
		);

		const report = buildErrorsNormalizationReport({ root });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.inconsistentErrorMapping, 1);
		assert.equal(report.summary.infrastructureClassificationDrift, 1);
		assert.equal(report.summary.operationalClassificationDrift, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("strict mode fails unresolved review only in strict mode", () => {
	const root = createFixture();
	try {
		writeSource(
			root,
			"packages/erp/orders/src/types.ts",
			`
				import { isAppError } from "@afenda/errors";
				export const guard = isAppError;
			`,
		);

		const advisory = buildErrorsNormalizationReport({ root });
		const strict = buildErrorsNormalizationReport({ root, strict: true });

		assert.equal(advisory.summary.status, "ok");
		assert.equal(advisory.summary.review, 1);
		assert.equal(strict.summary.status, "fail");
		assert.equal(strict.summary.strictFailure, true);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("formats CLI modes", () => {
	assert.deepEqual(parseOutputFormat([]), { format: "human", strict: false });
	assert.deepEqual(parseOutputFormat(["--json"]), {
		format: "json",
		strict: false,
	});
	assert.deepEqual(parseOutputFormat(["--strict", "--format=both"]), {
		format: "both",
		strict: true,
	});

	const output = formatHumanReport({
		summary: {
			canonical: 0,
			partial: 0,
			strict: false,
			status: "ok",
		},
		manualResultConstruction: [],
		manualSerialization: [],
		canonicalSerializationDrift: [],
		rawErrorLeaks: [],
		duplicateHelpers: [],
		postgresMappingDrift: [],
		httpProjectionDrift: [],
		infrastructureGuessing: [],
		swallowedUnknownCatch: [],
		unsafeDetailsPassthrough: [],
		directAppErrorUiExposure: [],
		inconsistentErrorMapping: [],
		retryableMetadataDrift: [],
		operationalClassificationDrift: [],
		infrastructureClassificationDrift: [],
		review: [],
	});

	assert.match(output, CHECK_OK_PATTERN);
});
