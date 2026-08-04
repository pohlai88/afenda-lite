/**
 * Negative fixtures for kernel governance register parity.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
	KernelDocProjectionError,
	parseKernelGovernanceDocRows,
	parseKernelPrdIndexRows,
} from "../../governance/kernel/doc-projection.ts";
import {
	buildExpectedGovernanceDocRows,
	validateKernelGovernance,
} from "../../governance/kernel/validator.ts";
import {
	createKernelGovernanceValidationContext,
	runKernelGovernanceCheck,
} from "../check-kernel-governance.mts";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

const healthyContext = () => createKernelGovernanceValidationContext();

describe("kernel governance validation", () => {
	it("accepts the living repository register", () => {
		const report = runKernelGovernanceCheck();
		expect(report.issues).toEqual([]);
		expect(report.packageCount).toBe(30);
	});

	it("rejects a PLANNED package that exists on disk", () => {
		const context = healthyContext();
		const { issues } = validateKernelGovernance({
			...context,
			directoryExists: (relativePath) =>
				relativePath === "packages/foundation/ids"
					? true
					: context.directoryExists(relativePath),
		});
		expect(
			issues.some(
				(issue) =>
					issue.code === "KRN-GOV-004" &&
					issue.path === "packages/foundation/ids",
			),
		).toBe(true);
	});

	it("rejects a PROVISIONAL package that is missing on disk", () => {
		const context = healthyContext();
		const { issues } = validateKernelGovernance({
			...context,
			directoryExists: (relativePath) =>
				relativePath === "packages/foundation/env"
					? false
					: context.directoryExists(relativePath),
		});
		expect(
			issues.some(
				(issue) =>
					issue.code === "KRN-GOV-005" &&
					issue.path === "packages/foundation/env",
			),
		).toBe(true);
	});

	it("rejects an unregistered kernel-band directory", () => {
		const context = healthyContext();
		const { issues } = validateKernelGovernance({
			...context,
			listBandDirectories: (band) =>
				band === "foundation"
					? ["errors", "shadow-package"]
					: context.listBandDirectories(band),
		});
		expect(
			issues.some(
				(issue) =>
					issue.code === "KRN-GOV-006" &&
					issue.path === "packages/foundation/shadow-package",
			),
		).toBe(true);
	});

	it("rejects governance doc drift", () => {
		const context = healthyContext();
		const expected = buildExpectedGovernanceDocRows();
		const drifted = expected.map((row) =>
			row.packageName === "@afenda/errors"
				? { ...row, admissionState: "PROVISIONAL" }
				: row,
		);
		const { issues } = validateKernelGovernance({
			...context,
			governanceDocRows: drifted,
		});
		expect(
			issues.some(
				(issue) =>
					issue.code === "KRN-GOV-007" &&
					issue.expected.includes("@afenda/errors.admissionState=ADMITTED"),
			),
		).toBe(true);
	});

	it("rejects duplicate and unexpected governance doc rows by name", () => {
		const context = healthyContext();
		const expected = buildExpectedGovernanceDocRows();
		const errorsRow = expected.find(
			(row) => row.packageName === "@afenda/errors",
		);
		const { issues } = validateKernelGovernance({
			...context,
			governanceDocRows: [
				...expected,
				errorsRow,
				{
					...errorsRow,
					packageName: "@afenda/not-registered-for-projection",
				},
			],
		});
		expect(
			issues.some(
				(issue) =>
					issue.code === "KRN-GOV-007" &&
					issue.actual === "duplicate @afenda/errors",
			),
		).toBe(true);
		expect(
			issues.some(
				(issue) =>
					issue.code === "KRN-GOV-007" &&
					issue.actual === "unexpected @afenda/not-registered-for-projection",
			),
		).toBe(true);
	});

	it("rejects near-miss governance table rows instead of dropping them", () => {
		expect(() =>
			parseKernelGovernanceDocRows(
				"| `@afenda/errors` | `foundation` | `CLOSED` | `NONE` | `C9` | `ADMITTED` |\n",
			),
		).toThrowError(KernelDocProjectionError);
	});

	it("rejects unknown package names in governance tables", () => {
		expect(() =>
			parseKernelGovernanceDocRows(
				"| `@afenda/not-a-kernel-package` | `foundation` | `CLOSED` | `NONE` | `C1` | `ADMITTED` |\n",
			),
		).toThrowError(/unknown kernel package/);
	});

	it("rejects duplicate package rows with both line numbers", () => {
		const duplicate = [
			"| `@afenda/errors` | `foundation` | `CLOSED` | `NONE` | `C1` | `ADMITTED` |",
			"| `@afenda/errors` | `foundation` | `CLOSED` | `NONE` | `C1` | `ADMITTED` |",
			"",
		].join("\n");
		expect(() => parseKernelGovernanceDocRows(duplicate)).toThrowError(
			/duplicate package @afenda\/errors \(first at line 1\)/,
		);
	});

	it("parses PRD index rows as the same KernelGovernanceDocRow shape", () => {
		const rows = parseKernelPrdIndexRows(
			"| 1 | `@afenda/errors` | `foundation` | `CLOSED` | `NONE` | `C1` | `ADMITTED` |\n",
		);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			packageName: "@afenda/errors",
			band: "foundation",
			criticality: "C1",
			sourceLine: 1,
		});
	});

	it("does not treat extra known gate ids as enforcement issues", () => {
		const context = healthyContext();
		const { issues } = validateKernelGovernance({
			...context,
			knownGovernanceGateIds: new Set([
				...context.knownGovernanceGateIds,
				"shadow-gate",
			]),
		});
		expect(issues.some((issue) => issue.code === "KRN-GOV-015")).toBe(false);
	});

	it("rejects unknown governance gate references via injected context", () => {
		const context = healthyContext();
		const { issues } = validateKernelGovernance({
			...context,
			knownGovernanceGateIds: new Set(["errors-boundary"]),
		});
		expect(
			issues.some(
				(issue) =>
					issue.code === "KRN-GOV-015" &&
					issue.expected.includes("errors-semantics"),
			),
		).toBe(true);
	});

	it("rejects a root-capability package missing src/index.ts", () => {
		const context = healthyContext();
		const { issues } = validateKernelGovernance({
			...context,
			fileExists: (relativePath) =>
				relativePath === "packages/foundation/errors/src/index.ts"
					? false
					: (context.fileExists?.(relativePath) ?? false),
		});
		expect(
			issues.some(
				(issue) =>
					issue.code === "KRN-GOV-011" &&
					issue.path === "packages/foundation/errors/src/index.ts",
			),
		).toBe(true);
	});

	it("rejects a root-capability package missing exports[.]", () => {
		const context = healthyContext();
		const { issues } = validateKernelGovernance({
			...context,
			packageHasRootExport: (packagePath) =>
				packagePath === "packages/foundation/errors"
					? false
					: (context.packageHasRootExport?.(packagePath) ?? false),
		});
		expect(
			issues.some(
				(issue) =>
					issue.code === "KRN-GOV-012" &&
					issue.path === "packages/foundation/errors/package.json",
			),
		).toBe(true);
	});

	it("does not require a root entrypoint for tooling-only packages", () => {
		const context = healthyContext();
		const { issues } = validateKernelGovernance({
			...context,
			fileExists: (relativePath) =>
				relativePath === "packages/foundation/config/src/index.ts"
					? false
					: (context.fileExists?.(relativePath) ?? false),
			packageHasRootExport: (packagePath) =>
				packagePath === "packages/foundation/config"
					? false
					: (context.packageHasRootExport?.(packagePath) ?? false),
		});
		expect(
			issues.some(
				(issue) =>
					(issue.code === "KRN-GOV-011" || issue.code === "KRN-GOV-012") &&
					issue.path.includes("packages/foundation/config"),
			),
		).toBe(false);
	});

	it("runs the CLI gate successfully against the repository", () => {
		const output = execFileSync(
			process.execPath,
			[
				"--import",
				"tsx",
				path.join(repoRoot, "scripts/check-kernel-governance.mts"),
			],
			{
				cwd: repoRoot,
				encoding: "utf8",
				env: process.env,
			},
		);
		expect(output).toContain('"schema": "afenda.kernel-governance/v2"');
		expect(output).toContain('"packageCount": 30');
	});
});
