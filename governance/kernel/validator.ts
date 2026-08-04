import {
	isKernelBand,
	KERNEL_BAND_PATH_PREFIX,
	type KernelBand,
} from "./bands.ts";
import { compareAsciiOrdinal } from "./compare.ts";
import type { KernelGovernanceDocRow, KernelPrdIndexRow } from "./doc-rows.ts";
import {
	KERNEL_ENFORCEMENT_CONTRACTS,
	type KernelEnforcementContractName,
} from "./enforcement-contracts.ts";
import {
	isKernelEnforcementProfileId,
	KERNEL_ENFORCEMENT_PROFILE_IDS,
} from "./enforcement-profiles.ts";
import { createIdGuard } from "./id-set.ts";
import { KERNEL_PACKAGES, type KernelPackageName } from "./package-registry.ts";

export type { KernelGovernanceDocRow, KernelPrdIndexRow } from "./doc-rows.ts";

/**
 * Canonical count of KERNEL_PACKAGES. Intentional friction: registry size
 * changes must bump this constant so authors acknowledge the catalog change
 * (KRN-GOV-001). There is no compile-time link — only this gate.
 */
export const CANONICAL_KERNEL_PACKAGE_COUNT = 30;

export const KERNEL_GOVERNANCE_ISSUE_CODES = Object.freeze([
	"KRN-GOV-001",
	"KRN-GOV-002",
	"KRN-GOV-003",
	"KRN-GOV-004",
	"KRN-GOV-005",
	"KRN-GOV-006",
	"KRN-GOV-007",
	"KRN-GOV-008",
	"KRN-GOV-009",
	"KRN-GOV-010",
	"KRN-GOV-011",
	"KRN-GOV-012",
	"KRN-GOV-013",
	"KRN-GOV-014",
	"KRN-GOV-015",
] as const);

export type KernelGovernanceIssueCode =
	(typeof KERNEL_GOVERNANCE_ISSUE_CODES)[number];

export const isKernelGovernanceIssueCode = createIdGuard(
	KERNEL_GOVERNANCE_ISSUE_CODES,
);

export interface KernelGovernanceIssue {
	readonly actual: string;
	readonly code: KernelGovernanceIssueCode;
	readonly expected: string;
	readonly path: string;
}

export interface KernelGovernanceReport {
	readonly issues: readonly KernelGovernanceIssue[];
	readonly packageCount: number;
	readonly schema: "afenda.kernel-governance/v2";
	readonly summary: {
		readonly blocked: number;
	};
}

export const KERNEL_ROOT_ENTRYPOINT = "src/index.ts" as const;

export interface KernelGovernanceValidationContext {
	readonly directoryExists: (relativePath: string) => boolean;
	readonly fileExists?: (relativePath: string) => boolean;
	readonly governanceDocRows: readonly KernelGovernanceDocRow[];
	readonly knownGovernanceGateIds: ReadonlySet<string>;
	readonly listBandDirectories: (band: KernelBand) => readonly string[];
	readonly packageHasRootExport?: (packagePath: string) => boolean;
	readonly prdIndexRows: readonly KernelPrdIndexRow[];
}

const issue = (input: KernelGovernanceIssue): KernelGovernanceIssue =>
	Object.freeze(input);

const validateRegistryShape = (): readonly KernelGovernanceIssue[] => {
	const issues: KernelGovernanceIssue[] = [];
	const names = Object.keys(KERNEL_PACKAGES) as KernelPackageName[];
	if (names.length !== CANONICAL_KERNEL_PACKAGE_COUNT) {
		issues.push(
			issue({
				code: "KRN-GOV-001",
				path: "governance/kernel/package-registry.ts",
				expected: `${CANONICAL_KERNEL_PACKAGE_COUNT} canonical kernel packages`,
				actual: `${names.length} packages`,
			}),
		);
	}
	for (const name of names) {
		const record = KERNEL_PACKAGES[name];
		if (!isKernelBand(record.band)) {
			issues.push(
				issue({
					code: "KRN-GOV-002",
					path: record.path,
					expected: "known kernel band",
					actual: record.band,
				}),
			);
			continue;
		}
		const expectedPrefix = KERNEL_BAND_PATH_PREFIX[record.band];
		if (!record.path.startsWith(`${expectedPrefix}/`)) {
			issues.push(
				issue({
					code: "KRN-GOV-003",
					path: record.path,
					expected: `path under ${expectedPrefix}`,
					actual: record.path,
				}),
			);
		}
	}
	return Object.freeze(issues);
};

const validateDiskParity = (
	context: KernelGovernanceValidationContext,
): readonly KernelGovernanceIssue[] => {
	const issues: KernelGovernanceIssue[] = [];
	for (const name of Object.keys(KERNEL_PACKAGES) as KernelPackageName[]) {
		const record = KERNEL_PACKAGES[name];
		const exists = context.directoryExists(record.path);
		if (record.admissionState === "PLANNED" && exists) {
			issues.push(
				issue({
					code: "KRN-GOV-004",
					path: record.path,
					expected: "absent while admissionState is PLANNED",
					actual: "directory exists",
				}),
			);
		}
		if (record.admissionState !== "PLANNED" && !exists) {
			issues.push(
				issue({
					code: "KRN-GOV-005",
					path: record.path,
					expected: "present while admissionState is not PLANNED",
					actual: "directory missing",
				}),
			);
		}
	}
	for (const band of Object.keys(KERNEL_BAND_PATH_PREFIX) as KernelBand[]) {
		const prefix = KERNEL_BAND_PATH_PREFIX[band];
		if (!context.directoryExists(prefix)) {
			continue;
		}
		for (const directory of context.listBandDirectories(band)) {
			const fullPath = `${prefix}/${directory}`;
			const registered = Object.values(KERNEL_PACKAGES).some(
				(record) => record.path === fullPath,
			);
			if (!registered) {
				issues.push(
					issue({
						code: "KRN-GOV-006",
						path: fullPath,
						expected: "registered kernel package",
						actual: "unregistered directory on disk",
					}),
				);
			}
		}
	}
	return Object.freeze(issues);
};

const validateDocProjection = (
	expectedRows: readonly KernelGovernanceDocRow[],
	actualRows: readonly KernelGovernanceDocRow[],
	path: string,
	code: KernelGovernanceIssueCode,
): readonly KernelGovernanceIssue[] => {
	const issues: KernelGovernanceIssue[] = [];
	const expectedNames = new Set(expectedRows.map((row) => row.packageName));
	const seenActual = new Set<string>();
	const actualByName = new Map<string, KernelGovernanceDocRow>();

	for (const row of actualRows) {
		if (seenActual.has(row.packageName)) {
			issues.push(
				issue({
					code,
					path,
					expected: "unique row per package",
					actual: `duplicate ${row.packageName}`,
				}),
			);
		}
		seenActual.add(row.packageName);
		if (!expectedNames.has(row.packageName)) {
			issues.push(
				issue({
					code,
					path,
					expected: "row for a registered package",
					actual: `unexpected ${row.packageName}`,
				}),
			);
			continue;
		}
		actualByName.set(row.packageName, row);
	}

	for (const expected of expectedRows) {
		const actual = actualByName.get(expected.packageName);
		if (actual === undefined) {
			issues.push(
				issue({
					code,
					path,
					expected: `${expected.packageName} row present`,
					actual: "missing",
				}),
			);
			continue;
		}
		for (const field of [
			"band",
			"kind",
			"persistence",
			"criticality",
			"admissionState",
		] as const) {
			if (actual[field] !== expected[field]) {
				issues.push(
					issue({
						code,
						path,
						expected: `${expected.packageName}.${field}=${expected[field]}`,
						actual: `${actual[field]}`,
					}),
				);
			}
		}
	}
	if (actualRows.length !== expectedRows.length) {
		issues.push(
			issue({
				code,
				path,
				expected: `${expectedRows.length} rows`,
				actual: `${actualRows.length} rows`,
			}),
		);
	}
	return Object.freeze(issues);
};

const validateEnforcementContracts = (
	context: KernelGovernanceValidationContext,
): readonly KernelGovernanceIssue[] => {
	const issues: KernelGovernanceIssue[] = [];
	for (const packageName of Object.keys(
		KERNEL_ENFORCEMENT_CONTRACTS,
	) as KernelEnforcementContractName[]) {
		const declaration = KERNEL_ENFORCEMENT_CONTRACTS[packageName];
		if (!(packageName in KERNEL_PACKAGES)) {
			issues.push(
				issue({
					code: "KRN-GOV-009",
					path: "governance/kernel/enforcement-contracts.ts",
					expected: "enforcement contract references registered package",
					actual: `${packageName} is unknown`,
				}),
			);
			continue;
		}
		const seenProfiles = new Set<string>();
		for (const profile of declaration.profiles) {
			if (!isKernelEnforcementProfileId(profile)) {
				issues.push(
					issue({
						code: "KRN-GOV-013",
						path: "governance/kernel/enforcement-contracts.ts",
						expected: `known profile (${KERNEL_ENFORCEMENT_PROFILE_IDS.join(", ")})`,
						actual: profile,
					}),
				);
			}
			if (seenProfiles.has(profile)) {
				issues.push(
					issue({
						code: "KRN-GOV-014",
						path: "governance/kernel/enforcement-contracts.ts",
						expected: "unique enforcement profiles",
						actual: `duplicate profile ${profile} on ${packageName}`,
					}),
				);
			}
			seenProfiles.add(profile);
		}
		for (const gateId of declaration.governanceGates) {
			if (!context.knownGovernanceGateIds.has(gateId)) {
				issues.push(
					issue({
						code: "KRN-GOV-015",
						path: "governance/kernel/enforcement-contracts.ts",
						expected: `registered governance gate ${gateId}`,
						actual: "unknown gate id",
					}),
				);
			}
		}
	}
	for (const name of Object.keys(KERNEL_PACKAGES) as KernelPackageName[]) {
		if (
			KERNEL_PACKAGES[name].admissionState === "ADMITTED" &&
			!(name in KERNEL_ENFORCEMENT_CONTRACTS)
		) {
			issues.push(
				issue({
					code: "KRN-GOV-010",
					path: "governance/kernel/enforcement-contracts.ts",
					expected: `enforcement contract for ${name}`,
					actual: "missing",
				}),
			);
		}
	}
	return Object.freeze(issues);
};

/**
 * Root-capability packages that exist on disk must expose `src/index.ts` and a
 * `"."` export. tooling-only packages (for example `@afenda/config`) deliberately
 * omit both — asserting them would invent a false violation.
 *
 * Disk presence, unregistered band directories, and ADMITTED enforcement-contract
 * rows are already covered by KRN-GOV-005 / 006 / 010.
 */
const validateAdoptionSurfaces = (
	context: KernelGovernanceValidationContext,
): readonly KernelGovernanceIssue[] => {
	const { fileExists, packageHasRootExport } = context;
	if (fileExists === undefined || packageHasRootExport === undefined) {
		return Object.freeze([]);
	}
	const issues: KernelGovernanceIssue[] = [];
	for (const name of Object.keys(KERNEL_PACKAGES) as KernelPackageName[]) {
		const record = KERNEL_PACKAGES[name];
		if (record.admissionState === "PLANNED") {
			continue;
		}
		if (!context.directoryExists(record.path)) {
			continue;
		}
		if (record.surface === "tooling-only") {
			continue;
		}
		const entrypointPath = `${record.path}/${KERNEL_ROOT_ENTRYPOINT}`;
		if (!fileExists(entrypointPath)) {
			issues.push(
				issue({
					code: "KRN-GOV-011",
					path: entrypointPath,
					expected: `root entrypoint for ${name}`,
					actual: "missing",
				}),
			);
		}
		if (!packageHasRootExport(record.path)) {
			issues.push(
				issue({
					code: "KRN-GOV-012",
					path: `${record.path}/package.json`,
					expected: `exports["."] for ${name}`,
					actual: "missing",
				}),
			);
		}
	}
	return Object.freeze(issues);
};

export const buildExpectedGovernanceDocRows =
	(): readonly KernelGovernanceDocRow[] =>
		Object.freeze(
			(
				Object.entries(KERNEL_PACKAGES) as [
					KernelPackageName,
					(typeof KERNEL_PACKAGES)[KernelPackageName],
				][]
			)
				.map(([packageName, record]) =>
					Object.freeze({
						packageName,
						band: record.band,
						kind: record.kind,
						persistence: record.persistence,
						criticality: record.criticality,
						admissionState: record.admissionState,
					}),
				)
				.sort((left, right) =>
					compareAsciiOrdinal(left.packageName, right.packageName),
				),
		);

/** Same semantic rows as {@link buildExpectedGovernanceDocRows} (`KernelPrdIndexRow` alias). */
export const buildExpectedPrdIndexRows = (): readonly KernelPrdIndexRow[] =>
	buildExpectedGovernanceDocRows();

export const validateKernelGovernance = (
	context: KernelGovernanceValidationContext,
): KernelGovernanceReport => {
	const expectedDocRows = buildExpectedGovernanceDocRows();
	const expectedPrdRows = buildExpectedPrdIndexRows();
	const issueGroups = [
		validateRegistryShape(),
		validateDiskParity(context),
		validateDocProjection(
			expectedDocRows,
			context.governanceDocRows,
			"packages/KERNEL-GOVERNANCE.md",
			"KRN-GOV-007",
		),
		validateDocProjection(
			expectedPrdRows,
			context.prdIndexRows,
			"packages/KERNEL-PRD-INDEX.md",
			"KRN-GOV-008",
		),
		validateEnforcementContracts(context),
		validateAdoptionSurfaces(context),
	];
	const issues = Object.freeze(
		issueGroups
			.flat()
			.sort((left, right) => compareAsciiOrdinal(left.path, right.path)),
	);
	return Object.freeze({
		schema: "afenda.kernel-governance/v2",
		packageCount: Object.keys(KERNEL_PACKAGES).length,
		summary: Object.freeze({
			blocked: issues.length,
		}),
		issues,
	});
};
