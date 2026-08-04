#!/usr/bin/env tsx
/**
 * pnpm check:kernel-governance — canonical kernel register parity gate.
 *
 * Proves the repository-level kernel package register matches disk,
 * doctrine projections, and enforcement declarations.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { GOVERNANCE_GATES } from "../../scripts/lib/governance-gates.mjs";
import { KERNEL_BAND_PATH_PREFIX } from "../kernel/bands.ts";
import { compareAsciiOrdinal } from "../kernel/compare.ts";
import {
	parseKernelGovernanceDocRows,
	parseKernelPrdIndexRows,
} from "../kernel/doc-projection.ts";
import {
	type KernelGovernanceReport,
	type KernelGovernanceValidationContext,
	validateKernelGovernance,
} from "../kernel/validator.ts";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

const isDirectory = (absolutePath: string): boolean => {
	try {
		return statSync(absolutePath).isDirectory();
	} catch {
		return false;
	}
};

const isFile = (absolutePath: string): boolean => {
	try {
		return statSync(absolutePath).isFile();
	} catch {
		return false;
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const packageHasRootExport = (packagePath: string): boolean => {
	const absolutePackageJson = path.join(repoRoot, packagePath, "package.json");
	if (!isFile(absolutePackageJson)) {
		return false;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(readFileSync(absolutePackageJson, "utf8"));
	} catch {
		return false;
	}
	if (!isRecord(parsed)) {
		return false;
	}
	const exportsValue = parsed.exports;
	return (
		typeof exportsValue === "object" &&
		exportsValue !== null &&
		!Array.isArray(exportsValue) &&
		Object.hasOwn(exportsValue, ".")
	);
};

const listBandDirectories = (
	band: keyof typeof KERNEL_BAND_PATH_PREFIX,
): readonly string[] => {
	const prefix = KERNEL_BAND_PATH_PREFIX[band];
	const absolutePrefix = path.join(repoRoot, prefix);
	if (!isDirectory(absolutePrefix)) {
		return Object.freeze([]);
	}
	return Object.freeze(
		readdirSync(absolutePrefix, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort(compareAsciiOrdinal),
	);
};

export const createKernelGovernanceValidationContext =
	(): KernelGovernanceValidationContext =>
		Object.freeze({
			directoryExists: (relativePath: string) =>
				isDirectory(path.join(repoRoot, relativePath)),
			fileExists: (relativePath: string) =>
				isFile(path.join(repoRoot, relativePath)),
			packageHasRootExport,
			governanceDocRows: parseKernelGovernanceDocRows(
				readFileSync(
					path.join(repoRoot, "packages/KERNEL-GOVERNANCE.md"),
					"utf8",
				),
			),
			prdIndexRows: parseKernelPrdIndexRows(
				readFileSync(
					path.join(repoRoot, "packages/KERNEL-PRD-INDEX.md"),
					"utf8",
				),
			),
			knownGovernanceGateIds: new Set(GOVERNANCE_GATES.map((gate) => gate.id)),
			listBandDirectories,
		});

export const runKernelGovernanceCheck = (): KernelGovernanceReport =>
	validateKernelGovernance(createKernelGovernanceValidationContext());

const isMain = (): boolean => {
	const [, entry] = process.argv;
	if (entry === undefined) {
		return false;
	}
	return import.meta.url === pathToFileURL(path.resolve(entry)).href;
};

if (isMain()) {
	const report = runKernelGovernanceCheck();
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	if (report.issues.length > 0) {
		for (const entry of report.issues) {
			process.stderr.write(
				`${entry.code} ${entry.path}: expected ${entry.expected}; actual ${entry.actual}\n`,
			);
		}
		process.exit(1);
	}
}
