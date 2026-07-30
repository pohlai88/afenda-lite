import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
	buildErrorsAdoptionReport,
	formatHumanReport,
	parseOutputFormat,
} from "./check-errors-adoption.mjs";

const ADVISORY_ZERO_PATTERN =
	/should consume but not consuming \(advisory\) \(0\)/u;

function createFixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-errors-adoption-"));
	mkdirSync(join(root, "apps"), { recursive: true });
	mkdirSync(join(root, "packages"), { recursive: true });
	return root;
}

function writePackage(root, packageRoot, pkg, files) {
	const fullRoot = join(root, packageRoot);
	mkdirSync(fullRoot, { recursive: true });
	writeFileSync(join(fullRoot, "package.json"), `${JSON.stringify(pkg)}\n`);

	for (const [relativePath, content] of Object.entries(files)) {
		const fullPath = join(fullRoot, relativePath);
		mkdirSync(join(fullPath, ".."), { recursive: true });
		writeFileSync(fullPath, content);
	}
}

function findPackage(report, name) {
	const found = report.packages.find((entry) => entry.name === name);
	if (!found) {
		throw new Error(`expected package ${name} in report`);
	}
	return found;
}

test("reports declared and adopted packages", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/erp/adopted",
			{
				name: "@afenda/adopted",
				dependencies: { "@afenda/errors": "workspace:*" },
			},
			{
				"src/index.ts": `
					import type { Result } from "@afenda/errors/result";
					export function run(): Result<{ id: string }> {
						return { ok: true, data: { id: "1" } };
					}
				`,
			},
		);

		const report = buildErrorsAdoptionReport({ root });
		const adopted = findPackage(report, "@afenda/adopted");

		assert.equal(adopted.status, "ADOPTED");
		assert.equal(adopted.auditCategory, "CANONICAL");
		assert.deepEqual(adopted.methodSummary, ["result-boundary"]);
		assert.equal(report.adopted.length, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("reports declared packages with incomplete adoption evidence", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/erp/partial",
			{
				name: "@afenda/partial",
				dependencies: { "@afenda/errors": "workspace:*" },
			},
			{
				"src/index.ts": `
					import type { SafeDetails } from "@afenda/errors";
					export type Details = SafeDetails;
					export function run() {
						try {
							return { ok: true };
						} catch {
							return { ok: false, error: "Invalid" };
						}
					}
				`,
			},
		);

		const report = buildErrorsAdoptionReport({ root });
		const partial = findPackage(report, "@afenda/partial");

		assert.equal(partial.status, "PARTIAL");
		assert.equal(partial.auditCategory, "INCONSISTENT");
		assert.equal(report.consumingButNotAdopted.length, 1);
		assert.ok(
			partial.issues.includes(
				"has no shared error adoption evidence in source",
			),
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("accepts runtime HTTP projection adoption without Result surface", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/runtime/http",
			{
				name: "@afenda/http",
				dependencies: { "@afenda/errors": "workspace:*" },
			},
			{
				"src/index.ts": `
					import { retryAfterSeconds } from "@afenda/errors/http";
					export function header(details: unknown) {
						return retryAfterSeconds(details);
					}
				`,
			},
		);

		const report = buildErrorsAdoptionReport({ root });
		const http = findPackage(report, "@afenda/http");

		assert.equal(http.status, "ADOPTED");
		assert.deepEqual(http.methodSummary, ["http-projection"]);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("uses explicit exemptions for reviewed non-boundary packages", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/runtime/metrics",
			{ name: "@afenda/metrics" },
			{
				"src/index.ts": `
					export function routeTemplate(value: string) {
						if (value.length === 0) throw new Error("Invalid template");
						return value;
					}
				`,
			},
		);

		const report = buildErrorsAdoptionReport({ root, strict: true });
		const metrics = findPackage(report, "@afenda/metrics");

		assert.equal(metrics.classification, "must-not-consume");
		assert.equal(metrics.status, "EXEMPT");
		assert.equal(metrics.auditCategory, "EXEMPT");
		assert.equal(report.shouldConsumeButNotConsuming.length, 0);
		assert.equal(report.summary.status, "ok");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("reports should-consume packages without dependency as advisory", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/erp/missing",
			{ name: "@afenda/missing" },
			{ "src/index.ts": "export const value = 1;\n" },
		);

		const report = buildErrorsAdoptionReport({ root });
		const missing = findPackage(report, "@afenda/missing");

		assert.equal(missing.classification, "must-consume");
		assert.equal(missing.status, "MISSING");
		assert.equal(missing.auditCategory, "REVIEW");
		assert.equal(report.shouldConsumeButNotConsuming.length, 1);
		assert.equal(report.summary.status, "ok");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("keeps exempt schema and pure packages out of adoption groups", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/data-plane/db",
			{ name: "@afenda/db" },
			{ "src/schema.ts": "export const tableName = 'audit';\n" },
		);

		const report = buildErrorsAdoptionReport({ root });
		const db = findPackage(report, "@afenda/db");

		assert.equal(db.classification, "must-not-consume");
		assert.equal(db.status, "EXEMPT");
		assert.equal(report.shouldConsumeButNotConsuming.length, 0);
		assert.equal(report.adopted.length, 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("does not treat domain-local outcomes as adoption evidence or violation", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/erp/local-domain",
			{ name: "@afenda/local-domain" },
			{
				"src/domain.ts": `
					type LocalDecision =
						| { ok: true; value: string }
						| { ok: false; reason: "EMPTY" | "INVALID" };
					export function decide(value: string): LocalDecision {
						if (value.length === 0) return { ok: false, reason: "EMPTY" };
						if (!/^[A-Z]+$/.test(value)) return { ok: false, reason: "INVALID" };
						return { ok: true, value };
					}
				`,
			},
		);

		const advisory = buildErrorsAdoptionReport({ root });
		const strict = buildErrorsAdoptionReport({ root, strict: true });
		const packageReport = findPackage(advisory, "@afenda/local-domain");

		assert.equal(packageReport.classification, "must-consume");
		assert.equal(packageReport.status, "MISSING");
		assert.equal(packageReport.sourceImports, 0);
		assert.equal(packageReport.resultEvidenceFiles, 0);
		assert.equal(advisory.summary.status, "ok");
		assert.equal(strict.summary.status, "fail");
		assert.equal(strict.summary.strictFailure, true);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("strict mode fails missing must-consume packages", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/erp/missing",
			{ name: "@afenda/missing" },
			{ "src/index.ts": "export const value = 1;\n" },
		);

		const report = buildErrorsAdoptionReport({ root, strict: true });

		assert.equal(report.summary.status, "fail");
		assert.equal(report.summary.strict, true);
		assert.equal(report.summary.strictFailure, true);
		assert.equal(report.shouldConsumeButNotConsuming.length, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("reports must-not-consume packages with errors dependency as violation", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/data-plane/db",
			{
				name: "@afenda/db",
				dependencies: { "@afenda/errors": "workspace:*" },
			},
			{
				"src/schema.ts": `
					import type { ErrorCode } from "@afenda/errors";
					export const code: ErrorCode = "BAD_REQUEST";
				`,
			},
		);

		const report = buildErrorsAdoptionReport({ root });
		const db = findPackage(report, "@afenda/db");

		assert.equal(db.status, "VIOLATION");
		assert.equal(db.auditCategory, "UNSAFE");
		assert.equal(report.violations.length, 1);
		assert.equal(report.summary.status, "fail");
		assert.ok(
			db.issues.includes("must-not-consume package depends on @afenda/errors"),
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("counts optional catch binding syntax", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/erp/catchless",
			{
				name: "@afenda/catchless",
				dependencies: { "@afenda/errors": "workspace:*" },
			},
			{
				"src/index.ts": `
					import type { Result } from "@afenda/errors/result";
					import { failFromUnknown } from "@afenda/errors/result";
					export function run(): Result<{ id: string }> {
						try {
							return { ok: true, data: { id: "1" } };
						} catch {
							return failFromUnknown(new Error("failure"));
						}
					}
				`,
			},
		);

		const report = buildErrorsAdoptionReport({ root });
		const packageReport = findPackage(report, "@afenda/catchless");

		assert.equal(packageReport.status, "ADOPTED");
		assert.equal(packageReport.catchFiles, 1);
		assert.equal(packageReport.normalizedCatchFiles, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("counts extended database imports as database boundaries", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/erp/drizzle-boundary",
			{
				name: "@afenda/drizzle-boundary",
				dependencies: {
					"@afenda/errors": "workspace:*",
					"drizzle-orm": "catalog:",
				},
			},
			{
				"src/index.ts": `
					import { eq } from "drizzle-orm";
					import { normalizePostgresUnknown } from "@afenda/errors/adapters/postgres";
					import type { Result } from "@afenda/errors/result";
					export function run(): Result<{ id: string }> {
						try {
							return { ok: true, data: { id: String(eq) } };
						} catch (error) {
							return { ok: false, error: normalizePostgresUnknown(error) };
						}
					}
				`,
			},
		);

		const report = buildErrorsAdoptionReport({ root });
		const packageReport = findPackage(report, "@afenda/drizzle-boundary");

		assert.equal(packageReport.status, "ADOPTED");
		assert.equal(packageReport.dbCatchFiles, 1);
		assert.equal(packageReport.postgresMappedDbCatchFiles, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("reports dynamic import and require as unsupported adoption evidence", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/erp/dynamic",
			{
				name: "@afenda/dynamic",
				dependencies: { "@afenda/errors": "workspace:*" },
			},
			{
				"src/index.ts": `
					export async function run() {
						const errors = await import("@afenda/errors");
						const result = require("@afenda/errors/result");
						return { errors, result };
					}
				`,
			},
		);

		const report = buildErrorsAdoptionReport({ root });
		const dynamic = findPackage(report, "@afenda/dynamic");

		assert.equal(dynamic.status, "MISSING");
		assert.equal(dynamic.sourceImports, 0);
		assert.equal(dynamic.unsupportedSourceImports, 1);
		assert.ok(
			dynamic.issues.includes(
				"uses unsupported dynamic import or require for @afenda/errors; use static ESM imports",
			),
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("summarizes shared persistence mapper adoption", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/erp/inventory",
			{
				name: "@afenda/inventory",
				dependencies: {
					"@afenda/db": "workspace:*",
					"@afenda/errors": "workspace:*",
				},
			},
			{
				"src/shared/persistence-errors.ts": `
					import { normalizePostgresUnknown } from "@afenda/errors/adapters/postgres";
					export function mapPersistenceFailure(error: unknown) {
						return normalizePostgresUnknown(error);
					}
				`,
				"src/repository.ts": `
					import { db } from "@afenda/db";
					import type { Result } from "@afenda/errors/result";
					import { mapPersistenceFailure } from "./shared/persistence-errors";
					export async function save(): Promise<Result<{ id: string }>> {
						try {
							await db;
							return { ok: true, data: { id: "1" } };
						} catch (error) {
							return { ok: false, error: mapPersistenceFailure(error) };
						}
					}
				`,
			},
		);

		const report = buildErrorsAdoptionReport({ root });
		const inventory = findPackage(report, "@afenda/inventory");

		assert.equal(inventory.status, "ADOPTED");
		assert.ok(inventory.methodSummary.includes("shared-persistence-mapper"));
		assert.ok(inventory.methodSummary.includes("postgres-adapter"));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("summarizes shared corporate administration translator adoption", () => {
	const root = createFixture();
	try {
		writePackage(
			root,
			"packages/erp/corporate-administration",
			{
				name: "@afenda/corporate-administration",
				dependencies: {
					"@afenda/db": "workspace:*",
					"@afenda/errors": "workspace:*",
				},
			},
			{
				"src/adapters/drizzle/errors.ts": `
					import { normalizePostgresUnknown } from "@afenda/errors/adapters/postgres";
					export function translateCorporateAdministrationInfrastructureError(error: unknown) {
						return normalizePostgresUnknown(error);
					}
				`,
				"src/repository.ts": `
					import { db } from "@afenda/db";
					import type { Result } from "@afenda/errors/result";
					import { translateCorporateAdministrationInfrastructureError } from "./adapters/drizzle/errors";
					export async function save(): Promise<Result<{ id: string }>> {
						try {
							await db;
							return { ok: true, data: { id: "1" } };
						} catch (error) {
							return { ok: false, error: translateCorporateAdministrationInfrastructureError(error) };
						}
					}
				`,
			},
		);

		const report = buildErrorsAdoptionReport({ root });
		const packageReport = findPackage(
			report,
			"@afenda/corporate-administration",
		);

		assert.equal(packageReport.status, "ADOPTED");
		assert.ok(
			packageReport.methodSummary.includes("shared-persistence-mapper"),
		);
		assert.ok(packageReport.methodSummary.includes("postgres-adapter"));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("formats human and json modes", () => {
	assert.deepEqual(parseOutputFormat([]), { format: "human", strict: false });
	assert.deepEqual(parseOutputFormat(["--json"]), {
		format: "json",
		strict: false,
	});
	assert.deepEqual(parseOutputFormat(["--format", "both", "--strict"]), {
		format: "both",
		strict: true,
	});

	const report = {
		summary: {
			applicablePackages: 0,
			strict: false,
			status: "ok",
		},
		shouldConsumeButNotConsuming: [],
		consumingButNotAdopted: [],
		adopted: [],
		exempt: [],
		review: [],
		violations: [],
	};

	assert.match(formatHumanReport(report), ADVISORY_ZERO_PATTERN);
});
