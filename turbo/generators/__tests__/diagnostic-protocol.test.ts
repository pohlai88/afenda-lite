import { describe, expect, it } from "vitest";

import {
	createGeneratorDiagnostic,
	createGeneratorDiagnosticReport,
	GENERATOR_DIAGNOSTIC_ORDER,
	GENERATOR_DIAGNOSTIC_REPORT_SCHEMA,
	GENERATOR_DIAGNOSTIC_REPORT_SCHEMA_ID,
	GeneratorDiagnosticProtocolError,
	generatorDiagnosticReportJsonSchemaV1,
	parseGeneratorDiagnosticReport,
	renderGeneratorDiagnosticReportJson,
	renderGeneratorDiagnosticReportText,
} from "../engine/diagnostic-protocol.ts";

const createDiagnosticFixture = (
	overrides: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> => ({
	code: "AFG-KERNEL-001",
	severity: "info",
	family: "kernel",
	package: "@afenda/errors",
	actual: { state: "present" },
	expected: { state: "present" },
	owner: "kernel.structure",
	treatment: "auto-reconcile",
	paths: ["packages/foundation/errors/package.json"],
	...overrides,
});

const isDeeplyFrozen = (value: unknown): boolean => {
	if (typeof value !== "object" || value === null) {
		return true;
	}
	const children = Array.isArray(value) ? value : Object.values(value);
	return Object.isFrozen(value) && children.every(isDeeplyFrozen);
};

describe("generator diagnostic protocol", () => {
	it.each([
		["clean", [], ["completed"], 0],
		[
			"warning-only",
			[createDiagnosticFixture({ severity: "warning" })],
			["completed"],
			0,
		],
		[
			"mechanical drift",
			[createDiagnosticFixture({ severity: "error" })],
			["completed"],
			10,
		],
		[
			"semantic blocker",
			[createDiagnosticFixture({ severity: "blocked" })],
			["completed"],
			20,
		],
		["invalid contract", [], ["invalid-contract"], 30],
		["execution failure", [], ["execution-failure"], 40],
	] as const)("maps %s to exit code %i", (_label, diagnostics, outcomes, expectedExitCode) => {
		const report = createGeneratorDiagnosticReport({ diagnostics, outcomes });

		expect(report.exitCode).toBe(expectedExitCode);
	});

	it("applies fixed exit precedence to mixed outcomes in any input order", () => {
		const warning = createDiagnosticFixture({ severity: "warning" });
		const drift = createDiagnosticFixture({
			code: "AFG-KERNEL-002",
			severity: "error",
		});
		const blocked = createDiagnosticFixture({
			code: "AFG-KERNEL-003",
			severity: "blocked",
			treatment: "collision",
		});
		const mixedCases = [
			{
				diagnostics: [warning, drift],
				outcomes: ["completed"],
				exitCode: 10,
			},
			{
				diagnostics: [drift, blocked],
				outcomes: ["completed"],
				exitCode: 20,
			},
			{
				diagnostics: [blocked],
				outcomes: ["invalid-contract"],
				exitCode: 30,
			},
			{
				diagnostics: [],
				outcomes: ["execution-failure", "invalid-contract"],
				exitCode: 40,
			},
			{
				diagnostics: [warning, createDiagnosticFixture()],
				outcomes: ["completed"],
				exitCode: 0,
			},
			{ diagnostics: [], outcomes: ["completed"], exitCode: 0 },
		] as const;

		for (const fixture of mixedCases) {
			const forward = createGeneratorDiagnosticReport(fixture);
			const reversed = createGeneratorDiagnosticReport({
				diagnostics: [...fixture.diagnostics].reverse(),
				outcomes: [...fixture.outcomes].reverse(),
			});
			expect(forward.exitCode).toBe(fixture.exitCode);
			expect(reversed.exitCode).toBe(fixture.exitCode);
		}
	});

	it("orders by family, package, code, and normalized path", () => {
		expect(GENERATOR_DIAGNOSTIC_ORDER).toEqual([
			"family",
			"package",
			"code",
			"first-normalized-path",
			"severity",
			"treatment",
			"owner",
			"all-normalized-paths",
			"expected-json",
			"actual-json",
		]);
		const report = createGeneratorDiagnosticReport({
			diagnostics: [
				createDiagnosticFixture({
					code: "AFG-KERNEL-002",
					paths: ["packages\\foundation\\errors\\src\\z.ts"],
				}),
				createDiagnosticFixture({
					code: "AFG-ERP-002",
					family: "erp",
					package: "@afenda/sales",
					paths: ["./packages/erp/sales/src/z.ts"],
				}),
				createDiagnosticFixture({
					code: "AFG-KERNEL-001",
					paths: ["packages/foundation/errors/src/a.ts"],
				}),
				createDiagnosticFixture({
					code: "AFG-ERP-001",
					family: "erp",
					package: "@afenda/accounting",
					paths: ["packages/erp/accounting/src/a.ts"],
				}),
			],
		});

		expect(
			report.diagnostics.map(
				({ family, package: packageName, code, paths }) => [
					family,
					packageName,
					code,
					paths[0],
				],
			),
		).toEqual([
			[
				"erp",
				"@afenda/accounting",
				"AFG-ERP-001",
				"packages/erp/accounting/src/a.ts",
			],
			["erp", "@afenda/sales", "AFG-ERP-002", "packages/erp/sales/src/z.ts"],
			[
				"kernel",
				"@afenda/errors",
				"AFG-KERNEL-001",
				"packages/foundation/errors/src/a.ts",
			],
			[
				"kernel",
				"@afenda/errors",
				"AFG-KERNEL-002",
				"packages/foundation/errors/src/z.ts",
			],
		]);
	});

	it("preserves repeated findings and case-distinct repository paths", () => {
		const report = createGeneratorDiagnosticReport({
			diagnostics: [
				createDiagnosticFixture({ paths: ["src/a.ts"] }),
				createDiagnosticFixture({ paths: ["src/A.ts"] }),
				createDiagnosticFixture({ paths: ["src/a.ts"] }),
			],
		});

		expect(report.diagnostics).toHaveLength(3);
		expect(report.diagnostics.map((diagnostic) => diagnostic.paths[0])).toEqual(
			["src/A.ts", "src/a.ts", "src/a.ts"],
		);
		expect(report.summary.total).toBe(3);
	});

	it("applies every declared diagnostic ordering tie-breaker", () => {
		const orderPair = (
			left: Readonly<Record<string, unknown>>,
			right: Readonly<Record<string, unknown>>,
		) =>
			createGeneratorDiagnosticReport({
				diagnostics: [
					createDiagnosticFixture(right),
					createDiagnosticFixture(left),
				],
			}).diagnostics;

		expect(
			orderPair({ severity: "error" }, { severity: "warning" }).map(
				(diagnostic) => diagnostic.severity,
			),
		).toEqual(["error", "warning"]);
		expect(
			orderPair(
				{ treatment: "auto-reconcile" },
				{ treatment: "collision" },
			).map((diagnostic) => diagnostic.treatment),
		).toEqual(["auto-reconcile", "collision"]);
		expect(
			orderPair({ owner: "a-owner" }, { owner: "z-owner" }).map(
				(diagnostic) => diagnostic.owner,
			),
		).toEqual(["a-owner", "z-owner"]);
		expect(
			orderPair(
				{ paths: ["src/a.ts", "src/b.ts"] },
				{ paths: ["src/a.ts", "src/z.ts"] },
			).map((diagnostic) => diagnostic.paths.join(",")),
		).toEqual(["src/a.ts,src/b.ts", "src/a.ts,src/z.ts"]);
		expect(
			orderPair({ expected: { rank: "a" } }, { expected: { rank: "z" } }).map(
				(diagnostic) => JSON.stringify(diagnostic.expected),
			),
		).toEqual(['{"rank":"a"}', '{"rank":"z"}']);
		expect(
			orderPair({ actual: { rank: "a" } }, { actual: { rank: "z" } }).map(
				(diagnostic) => JSON.stringify(diagnostic.actual),
			),
		).toEqual(['{"rank":"a"}', '{"rank":"z"}']);
	});

	it("renders one stable, versioned JSON representation", () => {
		const report = createGeneratorDiagnosticReport({
			diagnostics: [createDiagnosticFixture({ severity: "warning" })],
		});
		const rendered = renderGeneratorDiagnosticReportJson(report);
		const parsedInput: unknown = JSON.parse(rendered);

		expect(rendered.endsWith("\n")).toBe(true);
		expect(renderGeneratorDiagnosticReportJson(report)).toBe(rendered);
		expect(parseGeneratorDiagnosticReport(parsedInput)).toEqual(report);
		expect(report.schema).toBe(GENERATOR_DIAGNOSTIC_REPORT_SCHEMA);
		expect(() =>
			parseGeneratorDiagnosticReport({
				...report,
				schema: "afenda.generator-diagnostics/v2",
			}),
		).toThrowError("generator diagnostic report is invalid");
	});

	it("renders the complete treatment context as deterministic text", () => {
		const report = createGeneratorDiagnosticReport({
			diagnostics: [
				createDiagnosticFixture({
					actual: { file: "missing" },
					expected: { file: "present" },
					severity: "error",
				}),
			],
		});
		const rendered = renderGeneratorDiagnosticReportText(report);

		expect(rendered).toContain("schema=afenda.generator-diagnostics/v1");
		expect(rendered).toContain("outcomes=completed");
		expect(rendered).toContain("exit=10");
		expect(rendered).toContain(
			"kernel @afenda/errors AFG-KERNEL-001 error path=packages/foundation/errors/package.json",
		);
		expect(rendered).toContain("owner=kernel.structure");
		expect(rendered).toContain("treatment=auto-reconcile");
		expect(rendered).toContain('expected={"file":"present"}');
		expect(rendered).toContain('actual={"file":"missing"}');
		expect(renderGeneratorDiagnosticReportText(report)).toBe(rendered);
	});

	it("derives text, JSON, and exit code from the same canonical report", () => {
		const diagnostics = [
			createDiagnosticFixture({ severity: "warning", paths: ["src/z.ts"] }),
			createDiagnosticFixture({
				code: "AFG-KERNEL-002",
				severity: "error",
				paths: ["src/a.ts"],
			}),
		];
		const forward = createGeneratorDiagnosticReport({ diagnostics });
		const reversed = createGeneratorDiagnosticReport({
			diagnostics: [...diagnostics].reverse(),
		});

		expect(renderGeneratorDiagnosticReportJson(forward)).toBe(
			renderGeneratorDiagnosticReportJson(reversed),
		);
		expect(renderGeneratorDiagnosticReportText(forward)).toBe(
			renderGeneratorDiagnosticReportText(reversed),
		);
		expect(forward.exitCode).toBe(10);
		expect(reversed.exitCode).toBe(forward.exitCode);
	});

	it("canonicalizes JSON keys and Unicode values", () => {
		const report = createGeneratorDiagnosticReport({
			diagnostics: [
				createDiagnosticFixture({
					actual: {
						zebra: "e\u0301",
						alpha: { two: 2, omitted: undefined, one: 1 },
					},
				}),
			],
		});

		expect(JSON.stringify(report.diagnostics[0]?.actual)).toBe(
			'{"alpha":{"one":1,"two":2},"zebra":"é"}',
		);
		const decomposedKeyReport = createGeneratorDiagnosticReport({
			diagnostics: [
				createDiagnosticFixture({ actual: { "e\u0301": 1, z: 2 } }),
			],
		});
		const composedKeyReport = createGeneratorDiagnosticReport({
			diagnostics: [createDiagnosticFixture({ actual: { é: 1, z: 2 } })],
		});
		expect(renderGeneratorDiagnosticReportJson(decomposedKeyReport)).toBe(
			renderGeneratorDiagnosticReportJson(composedKeyReport),
		);
	});

	it.each([
		"/absolute/path.ts",
		"C:\\absolute\\path.ts",
		"../outside.ts",
		"src/../outside.ts",
		"src//index.ts",
		"src/./index.ts",
		"src/index.ts\nforged",
	])("rejects unsafe diagnostic path %s", (path) => {
		expect(() =>
			createGeneratorDiagnostic(createDiagnosticFixture({ paths: [path] })),
		).toThrowError(GeneratorDiagnosticProtocolError);
	});

	it("rejects paths that collide after normalization", () => {
		expect(() =>
			createGeneratorDiagnostic(
				createDiagnosticFixture({
					paths: ["./src/index.ts", "src\\index.ts"],
				}),
			),
		).toThrowError("diagnostic paths must be unique after normalization");
	});

	it("rejects non-JSON and oversized diagnostic values", () => {
		expect(() =>
			createGeneratorDiagnostic(
				createDiagnosticFixture({ actual: new Date("2026-08-02T00:00:00Z") }),
			),
		).toThrowError(GeneratorDiagnosticProtocolError);
		expect(() =>
			createGeneratorDiagnostic(
				createDiagnosticFixture({ actual: ["valid", undefined] }),
			),
		).toThrowError("diagnostic JSON arrays cannot contain undefined values");
		expect(() =>
			createGeneratorDiagnostic(
				createDiagnosticFixture({ actual: "x".repeat(4097) }),
			),
		).toThrowError("diagnostic actual exceeds 4096 bytes");
	});

	it("rejects text-control injection and normalized JSON key collisions", () => {
		expect(() =>
			createGeneratorDiagnostic(
				createDiagnosticFixture({ owner: "kernel.structure\nforged" }),
			),
		).toThrowError(GeneratorDiagnosticProtocolError);
		expect(() =>
			createGeneratorDiagnostic(
				createDiagnosticFixture({
					actual: { "e\u0301": "decomposed", é: "composed" },
				}),
			),
		).toThrowError(
			"diagnostic JSON object keys must be unique after Unicode normalization",
		);
	});

	it("round-trips prototype-sensitive JSON keys without meaning loss", () => {
		const actualInput: unknown = JSON.parse(
			'{"__proto__":{"state":"missing"},"constructor":"kept","prototype":"kept","z":1}',
		);
		const report = createGeneratorDiagnosticReport({
			diagnostics: [createDiagnosticFixture({ actual: actualInput })],
		});
		const rendered = renderGeneratorDiagnosticReportJson(report);

		expect(rendered).toContain(
			'"__proto__": {\n          "state": "missing"\n        }',
		);
		expect(rendered).toContain('"constructor": "kept"');
		expect(rendered).toContain('"prototype": "kept"');
		expect(parseGeneratorDiagnosticReport(JSON.parse(rendered))).toEqual(
			report,
		);
	});

	it("freezes reports and their nested semantic values", () => {
		const report = createGeneratorDiagnosticReport({
			diagnostics: [
				createDiagnosticFixture({
					actual: { nested: { values: ["actual"] } },
					expected: { nested: { values: ["expected"] } },
				}),
			],
		});
		const [diagnostic] = report.diagnostics;
		if (diagnostic === undefined) {
			throw new Error("expected one canonical diagnostic");
		}

		expect(isDeeplyFrozen(report)).toBe(true);
		expect(Reflect.set(report, "exitCode", 40)).toBe(false);
		expect(Reflect.set(report.summary, "total", 0)).toBe(false);
		expect(Reflect.set(report.diagnostics, "0", undefined)).toBe(false);
		expect(Reflect.set(diagnostic, "severity", "warning")).toBe(false);
		expect(Reflect.set(diagnostic.paths, "0", "forged.ts")).toBe(false);
		if (typeof diagnostic.actual === "object" && diagnostic.actual !== null) {
			expect(Reflect.set(diagnostic.actual, "nested", null)).toBe(false);
		}
		if (
			typeof diagnostic.expected === "object" &&
			diagnostic.expected !== null
		) {
			expect(Reflect.set(diagnostic.expected, "nested", null)).toBe(false);
		}
	});

	it("rejects report fields that do not match canonical derivation", () => {
		const report = createGeneratorDiagnosticReport({ diagnostics: [] });

		expect(() =>
			renderGeneratorDiagnosticReportJson({ ...report, exitCode: 40 }),
		).toThrowError("generator diagnostic report is not canonical");
		expect(() =>
			createGeneratorDiagnosticReport({
				diagnostics: [],
				outcomes: ["completed", "invalid-contract"],
			}),
		).toThrowError("completed cannot be combined with failure outcomes");
	});

	it("derives and freezes its published JSON Schema from the runtime schema", () => {
		const serializedSchema = JSON.stringify(
			generatorDiagnosticReportJsonSchemaV1,
		);

		expect(serializedSchema).toContain(
			`"$id":"${GENERATOR_DIAGNOSTIC_REPORT_SCHEMA_ID}"`,
		);
		expect(serializedSchema).toContain(
			'"$schema":"https://json-schema.org/draft/2020-12/schema"',
		);
		expect(serializedSchema).toContain(
			'"required":["schema","outcomes","diagnostics","summary","exitCode"]',
		);
		expect(Object.isFrozen(generatorDiagnosticReportJsonSchemaV1)).toBe(true);
	});
});
