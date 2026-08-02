import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

export const GENERATOR_GOVERNANCE_CONVERGENCE_SCHEMA =
	"afenda.generator-governance-convergence/v1" as const;

export type GeneratorGovernanceIssueSeverity = "blocked" | "warning";

export interface GeneratorGovernanceRequiredSurface {
	readonly path: string;
	readonly role:
		| "authority-source"
		| "contract-doc"
		| "documentation"
		| "root-gate"
		| "test";
}

export interface GeneratorGovernanceIssue {
	readonly actual: string;
	readonly code:
		| "AFG-GOV-001"
		| "AFG-GOV-002"
		| "AFG-GOV-003"
		| "AFG-GOV-004"
		| "AFG-GOV-005"
		| "AFG-GOV-006"
		| "AFG-GOV-007"
		| "AFG-GOV-008"
		| "AFG-GOV-009"
		| "AFG-GOV-010"
		| "AFG-GOV-011";
	readonly expected: string;
	readonly path: string;
	readonly severity: GeneratorGovernanceIssueSeverity;
}

export interface GeneratorGovernanceSummary {
	readonly authoritySources: number;
	readonly blocked: number;
	readonly contractDocs: number;
	readonly issues: number;
	readonly tests: number;
	readonly warnings: number;
}

export interface GeneratorGovernanceConvergenceReportV1 {
	readonly bannedTrunks: readonly string[];
	readonly issues: readonly GeneratorGovernanceIssue[];
	readonly monorepoIndexPath: "docs-V2/monorepo/README.md";
	readonly requiredSurfaces: readonly GeneratorGovernanceRequiredSurface[];
	readonly schema: typeof GENERATOR_GOVERNANCE_CONVERGENCE_SCHEMA;
	readonly summary: GeneratorGovernanceSummary;
	readonly testRoot: "turbo/generators/__tests__";
}

interface CreateGeneratorGovernanceConvergenceReportInput {
	readonly repositoryRoot: string;
}

const MONOREPO_INDEX_PATH = "docs-V2/monorepo/README.md" as const;
const PHASE_EXIT_MATRIX_PATH =
	"docs-V2/monorepo/g8-generator-phase-exit-convergence-contract.md" as const;
const PACKAGE_GOVERNANCE_PATH =
	"docs-V2/modules/PACKAGE-GOVERNANCE.md" as const;
const PACKAGE_JSON_PATH = "package.json" as const;
const TURBO_JSON_PATH = "turbo.json" as const;
const TEST_ROOT = "turbo/generators/__tests__" as const;
const BANNED_TRUNKS = Object.freeze(["docs", "doc"] as const);
const LEADING_PATH_SEPARATOR_PATTERN = /^[/\\]/;
const LINE_BREAK_PATTERN = /\r?\n/u;
const WHITESPACE_PATTERN = /\s+/gu;

const REQUIRED_CONTRACT_DOCS = Object.freeze([
	"docs-V2/monorepo/g1-erp-manifest-authority-contract.md",
	"docs-V2/monorepo/g2-erp-layout-convergence-contract.md",
	"docs-V2/monorepo/g3-erp-projection-lock-contract.md",
	"docs-V2/monorepo/g4-explicit-erp-spec-contract.md",
	"docs-V2/monorepo/g5-versioned-treatment-recovery-contract.md",
	"docs-V2/monorepo/g6-kernel-package-adoption-contract.md",
	"docs-V2/monorepo/g7-repo-documentation-governance-convergence-contract.md",
	PHASE_EXIT_MATRIX_PATH,
] as const);

const REQUIRED_AUTHORITY_SOURCES = Object.freeze([
	"turbo/generators/erp-generator/manifest-authority.ts",
	"turbo/generators/erp-generator/layout-authority.ts",
	"turbo/generators/erp-generator/projection-lock-authority.ts",
	"turbo/generators/erp-generator/explicit-spec.ts",
	"turbo/generators/erp-generator/treatment-authority.ts",
	"turbo/generators/kernel-generator/adoption-authority.ts",
	"turbo/generators/engine/governance-convergence.ts",
] as const);

const REQUIRED_TESTS = Object.freeze([
	"turbo/generators/__tests__/erp-manifest-authority.test.ts",
	"turbo/generators/__tests__/erp-layout-authority.test.ts",
	"turbo/generators/__tests__/erp-projection-lock-authority.test.ts",
	"turbo/generators/__tests__/erp-explicit-spec.test.ts",
	"turbo/generators/__tests__/erp-treatment-authority.test.ts",
	"turbo/generators/__tests__/kernel-adoption-authority.test.ts",
	"turbo/generators/__tests__/governance-convergence.test.ts",
] as const);

const REQUIRED_DOCUMENTATION = Object.freeze([
	MONOREPO_INDEX_PATH,
	PACKAGE_GOVERNANCE_PATH,
] as const);

const REQUIRED_ROOT_GATES = Object.freeze([
	PACKAGE_JSON_PATH,
	TURBO_JSON_PATH,
] as const);

const REQUIRED_PHASE_ROWS = Object.freeze([
	Object.freeze({
		slice: "G0.x",
		contract: "Present",
		implementation: "Complete",
		tests: "Passing",
		executableGate: "Present",
		docsAligned: "Aligned",
		commit: "Committed",
		status: "Sealed",
	}),
	Object.freeze({
		slice: "G1",
		contract: "Present",
		implementation: "Complete",
		tests: "Present",
		executableGate: "Governed",
		docsAligned: "Aligned",
		commit: "Committed",
		status: "Sealed",
	}),
	Object.freeze({
		slice: "G2",
		contract: "Present",
		implementation: "Complete",
		tests: "Present",
		executableGate: "Governed",
		docsAligned: "Aligned",
		commit: "Uncommitted",
		status: "Pending seal",
	}),
	Object.freeze({
		slice: "G3",
		contract: "Present",
		implementation: "Complete",
		tests: "Present",
		executableGate: "Governed",
		docsAligned: "Aligned",
		commit: "Uncommitted",
		status: "Pending seal",
	}),
	Object.freeze({
		slice: "G4",
		contract: "Present",
		implementation: "Complete",
		tests: "Present",
		executableGate: "Governed",
		docsAligned: "Aligned",
		commit: "Uncommitted",
		status: "Pending seal",
	}),
	Object.freeze({
		slice: "G5",
		contract: "Present",
		implementation: "Complete",
		tests: "Present",
		executableGate: "Governed",
		docsAligned: "Aligned",
		commit: "Uncommitted",
		status: "Pending seal",
	}),
	Object.freeze({
		slice: "G6",
		contract: "Present",
		implementation: "Complete",
		tests: "Present",
		executableGate: "Governed",
		docsAligned: "Aligned",
		commit: "Uncommitted",
		status: "Pending seal",
	}),
	Object.freeze({
		slice: "G7",
		contract: "Present",
		implementation: "Complete",
		tests: "Present",
		executableGate: "Authority",
		docsAligned: "Aligned",
		commit: "Uncommitted",
		status: "Pending seal",
	}),
	Object.freeze({
		slice: "G8",
		contract: "Present",
		implementation: "Read-only",
		tests: "Required",
		executableGate: "Phase-exit gate",
		docsAligned: "Required",
		commit: "Separate",
		status: "In progress",
	}),
] as const);

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const exists = async (
	repositoryRoot: string,
	path: string,
): Promise<boolean> => {
	try {
		await stat(resolve(repositoryRoot, path));
		return true;
	} catch {
		return false;
	}
};

const fileExists = async (
	repositoryRoot: string,
	path: string,
): Promise<boolean> => {
	try {
		return (await stat(resolve(repositoryRoot, path))).isFile();
	} catch {
		return false;
	}
};

const directoryExists = async (
	repositoryRoot: string,
	path: string,
): Promise<boolean> => {
	try {
		return (await stat(resolve(repositoryRoot, path))).isDirectory();
	} catch {
		return false;
	}
};

const createRequiredSurfaces =
	(): readonly GeneratorGovernanceRequiredSurface[] =>
		Object.freeze(
			[
				...REQUIRED_CONTRACT_DOCS.map((path) =>
					Object.freeze({ role: "contract-doc" as const, path }),
				),
				...REQUIRED_AUTHORITY_SOURCES.map((path) =>
					Object.freeze({ role: "authority-source" as const, path }),
				),
				...REQUIRED_TESTS.map((path) =>
					Object.freeze({ role: "test" as const, path }),
				),
				...REQUIRED_DOCUMENTATION.map((path) =>
					Object.freeze({ role: "documentation" as const, path }),
				),
				...REQUIRED_ROOT_GATES.map((path) =>
					Object.freeze({ role: "root-gate" as const, path }),
				),
			].sort((left, right) => compareText(left.path, right.path)),
		);

const issue = (input: GeneratorGovernanceIssue): GeneratorGovernanceIssue =>
	Object.freeze(input);

const checkBannedTrunks = async (
	repositoryRoot: string,
): Promise<readonly GeneratorGovernanceIssue[]> => {
	const issues: GeneratorGovernanceIssue[] = [];
	if (await exists(repositoryRoot, "docs")) {
		issues.push(
			issue({
				code: "AFG-GOV-001",
				severity: "blocked",
				path: "docs",
				expected: "Living docs trunk absent until Docs-lane reopen",
				actual: "docs exists",
			}),
		);
	}
	if (await exists(repositoryRoot, "doc")) {
		issues.push(
			issue({
				code: "AFG-GOV-002",
				severity: "blocked",
				path: "doc",
				expected: "legacy doc trunk absent",
				actual: "doc exists",
			}),
		);
	}
	return Object.freeze(issues);
};

const checkRequiredFiles = async (
	repositoryRoot: string,
	requiredSurfaces: readonly GeneratorGovernanceRequiredSurface[],
): Promise<readonly GeneratorGovernanceIssue[]> => {
	const issues = await Promise.all(
		requiredSurfaces.map(async (surface) => {
			if (await fileExists(repositoryRoot, surface.path)) {
				return null;
			}
			let code: GeneratorGovernanceIssue["code"];
			if (surface.role === "contract-doc" || surface.role === "documentation") {
				code = "AFG-GOV-003";
			} else if (surface.role === "authority-source") {
				code = "AFG-GOV-005";
			} else if (surface.role === "root-gate") {
				code = "AFG-GOV-010";
			} else {
				code = "AFG-GOV-006";
			}
			return issue({
				code,
				severity: "warning",
				path: surface.path,
				expected: `${surface.role} exists`,
				actual: "missing",
			});
		}),
	);
	return Object.freeze(
		issues
			.filter((entry) => entry !== null)
			.sort((left, right) => compareText(left.path, right.path)),
	);
};

const normalizeMatrixCell = (value: string): string =>
	value.replaceAll("`", "").replaceAll("**", "").trim();

const normalizeWhitespace = (value: string): string =>
	value.replace(WHITESPACE_PATTERN, " ").trim();

const includesNormalized = (contents: string, expected: string): boolean =>
	normalizeWhitespace(contents).includes(normalizeWhitespace(expected));

const parsePhaseMatrixRows = (
	contents: string,
): ReadonlyMap<string, readonly string[]> => {
	const rows = new Map<string, readonly string[]>();
	for (const line of contents.split(LINE_BREAK_PATTERN)) {
		if (!line.startsWith("|")) {
			continue;
		}
		const cells = line.split("|").slice(1, -1).map(normalizeMatrixCell);
		const [firstCell] = cells;
		if (
			cells.length !== 8 ||
			firstCell === undefined ||
			firstCell === "Slice" ||
			firstCell.startsWith("-")
		) {
			continue;
		}
		rows.set(firstCell, Object.freeze(cells));
	}
	return rows;
};

const checkPhaseMatrix = async (
	repositoryRoot: string,
): Promise<readonly GeneratorGovernanceIssue[]> => {
	if (!(await fileExists(repositoryRoot, PHASE_EXIT_MATRIX_PATH))) {
		return Object.freeze([
			issue({
				code: "AFG-GOV-008",
				severity: "warning",
				path: PHASE_EXIT_MATRIX_PATH,
				expected: "G8 phase-exit matrix exists",
				actual: "missing",
			}),
		]);
	}
	const contents = await readFile(
		resolve(repositoryRoot, PHASE_EXIT_MATRIX_PATH),
		"utf8",
	);
	const rows = parsePhaseMatrixRows(contents);
	const issues: GeneratorGovernanceIssue[] = [];
	for (const expected of REQUIRED_PHASE_ROWS) {
		const row = rows.get(expected.slice);
		const expectedCells = Object.freeze([
			expected.slice,
			expected.contract,
			expected.implementation,
			expected.tests,
			expected.executableGate,
			expected.docsAligned,
			expected.commit,
			expected.status,
		]);
		if (row === undefined) {
			issues.push(
				issue({
					code: "AFG-GOV-008",
					severity: "warning",
					path: PHASE_EXIT_MATRIX_PATH,
					expected: `${expected.slice} matrix row exists`,
					actual: "missing",
				}),
			);
			continue;
		}
		if (row.join("|") !== expectedCells.join("|")) {
			issues.push(
				issue({
					code: "AFG-GOV-008",
					severity: "warning",
					path: PHASE_EXIT_MATRIX_PATH,
					expected: expectedCells.join(" | "),
					actual: row.join(" | "),
				}),
			);
		}
	}
	return Object.freeze(
		issues.sort((left, right) => compareText(left.actual, right.actual)),
	);
};

const checkRetiredManifestAuthorityReferences = async (
	repositoryRoot: string,
): Promise<readonly GeneratorGovernanceIssue[]> => {
	const packageGovernanceExists = await fileExists(
		repositoryRoot,
		PACKAGE_GOVERNANCE_PATH,
	);
	const phaseMatrixExists = await fileExists(
		repositoryRoot,
		PHASE_EXIT_MATRIX_PATH,
	);
	const [packageGovernance, phaseMatrix] = await Promise.all([
		packageGovernanceExists
			? readFile(resolve(repositoryRoot, PACKAGE_GOVERNANCE_PATH), "utf8")
			: "",
		phaseMatrixExists
			? readFile(resolve(repositoryRoot, PHASE_EXIT_MATRIX_PATH), "utf8")
			: "",
	]);
	const issues: GeneratorGovernanceIssue[] = [];
	if (
		packageGovernance.includes("LIVING_ERP_MANIFEST_PACKAGES") &&
		!packageGovernance.includes("retired")
	) {
		issues.push(
			issue({
				code: "AFG-GOV-009",
				severity: "warning",
				path: PACKAGE_GOVERNANCE_PATH,
				expected:
					"retired ERP manifest package authority is marked retired and replaced by generator-owned manifest authority",
				actual: "retired authority referenced without retired classification",
			}),
		);
	}
	if (
		!includesNormalized(
			packageGovernance,
			"generator-owned manifest authority projection",
		)
	) {
		issues.push(
			issue({
				code: "AFG-GOV-009",
				severity: "warning",
				path: PACKAGE_GOVERNANCE_PATH,
				expected:
					"package governance identifies generator-owned manifest authority projection",
				actual: "canonical replacement wording missing",
			}),
		);
	}
	if (
		!includesNormalized(
			phaseMatrix,
			"`LIVING_ERP_MANIFEST_PACKAGES` is retired and must not be reintroduced",
		)
	) {
		issues.push(
			issue({
				code: "AFG-GOV-009",
				severity: "warning",
				path: PHASE_EXIT_MATRIX_PATH,
				expected: "G8 records retired manifest authority policy",
				actual: "retired authority policy missing",
			}),
		);
	}
	return Object.freeze(issues);
};

const checkConfiguredGeneratorGate = async (
	repositoryRoot: string,
): Promise<readonly GeneratorGovernanceIssue[]> => {
	const [packageJsonExists, turboJsonExists] = await Promise.all([
		fileExists(repositoryRoot, PACKAGE_JSON_PATH),
		fileExists(repositoryRoot, TURBO_JSON_PATH),
	]);
	if (!(packageJsonExists && turboJsonExists)) {
		return Object.freeze([]);
	}
	const [packageJson, turboJson] = await Promise.all([
		readFile(resolve(repositoryRoot, PACKAGE_JSON_PATH), "utf8"),
		readFile(resolve(repositoryRoot, TURBO_JSON_PATH), "utf8"),
	]);
	const issues: GeneratorGovernanceIssue[] = [];
	if (
		!packageJson.includes(
			'"generator:check": "tsx turbo/generators/engine/generator-check.ts"',
		)
	) {
		issues.push(
			issue({
				code: "AFG-GOV-010",
				severity: "warning",
				path: PACKAGE_JSON_PATH,
				expected: "root generator:check script targets generator-check.ts",
				actual: "required script missing",
			}),
		);
	}
	for (const input of [
		"$TURBO_ROOT$/docs-V2/monorepo/**",
		"$TURBO_ROOT$/docs-V2/modules/PACKAGE-GOVERNANCE.md",
	]) {
		if (!turboJson.includes(input)) {
			issues.push(
				issue({
					code: "AFG-GOV-011",
					severity: "warning",
					path: TURBO_JSON_PATH,
					expected: `generator:check task input includes ${input}`,
					actual: "required cache input missing",
				}),
			);
		}
	}
	return Object.freeze(issues);
};

const checkMonorepoIndex = async (
	repositoryRoot: string,
): Promise<readonly GeneratorGovernanceIssue[]> => {
	if (!(await fileExists(repositoryRoot, MONOREPO_INDEX_PATH))) {
		return Object.freeze([
			issue({
				code: "AFG-GOV-003",
				severity: "warning",
				path: MONOREPO_INDEX_PATH,
				expected: "monorepo Scratch index exists",
				actual: "missing",
			}),
		]);
	}
	const contents = await readFile(
		resolve(repositoryRoot, MONOREPO_INDEX_PATH),
		"utf8",
	);
	const missingLinks = REQUIRED_CONTRACT_DOCS.filter(
		(path) => !contents.includes(path.replace("docs-V2/monorepo/", "")),
	);
	return Object.freeze(
		missingLinks.map((path) =>
			issue({
				code: "AFG-GOV-004",
				severity: "warning",
				path: MONOREPO_INDEX_PATH,
				expected: `index links ${path}`,
				actual: "link missing",
			}),
		),
	);
};

const listTestFilesOutsideCanonicalRoot = async (
	repositoryRoot: string,
): Promise<readonly string[]> => {
	const generatorRoot = resolve(repositoryRoot, "turbo/generators");
	if (!(await directoryExists(repositoryRoot, "turbo/generators"))) {
		return Object.freeze([]);
	}
	const entries = await walk(generatorRoot);
	return Object.freeze(
		entries
			.map((path) =>
				path
					.replace(resolve(repositoryRoot), "")
					.replace(LEADING_PATH_SEPARATOR_PATTERN, "")
					.replaceAll("\\", "/"),
			)
			.filter(
				(path) =>
					path.endsWith(".test.ts") && !path.startsWith(`${TEST_ROOT}/`),
			)
			.sort(compareText),
	);
};

const walk = async (absoluteRoot: string): Promise<readonly string[]> => {
	const entries = await readdir(absoluteRoot, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const path = resolve(absoluteRoot, entry.name);
			if (entry.isDirectory()) {
				return entry.name === "node_modules" || entry.name === ".turbo"
					? []
					: walk(path);
			}
			return entry.isFile() ? [path] : [];
		}),
	);
	return Object.freeze(nested.flat().sort(compareText));
};

const checkTestPlacement = async (
	repositoryRoot: string,
): Promise<readonly GeneratorGovernanceIssue[]> => {
	const outside = await listTestFilesOutsideCanonicalRoot(repositoryRoot);
	return Object.freeze(
		outside.map((path) =>
			issue({
				code: "AFG-GOV-007",
				severity: "blocked",
				path,
				expected: `generator tests under ${TEST_ROOT}`,
				actual: "test outside canonical root",
			}),
		),
	);
};

const createSummary = (
	issues: readonly GeneratorGovernanceIssue[],
	requiredSurfaces: readonly GeneratorGovernanceRequiredSurface[],
): GeneratorGovernanceSummary =>
	Object.freeze({
		issues: issues.length,
		warnings: issues.filter((entry) => entry.severity === "warning").length,
		blocked: issues.filter((entry) => entry.severity === "blocked").length,
		contractDocs: requiredSurfaces.filter(
			(surface) => surface.role === "contract-doc",
		).length,
		authoritySources: requiredSurfaces.filter(
			(surface) => surface.role === "authority-source",
		).length,
		tests: requiredSurfaces.filter((surface) => surface.role === "test").length,
	});

export const createGeneratorGovernanceConvergenceReport = async ({
	repositoryRoot,
}: CreateGeneratorGovernanceConvergenceReportInput): Promise<GeneratorGovernanceConvergenceReportV1> => {
	const requiredSurfaces = createRequiredSurfaces();
	const issueGroups = await Promise.all([
		checkBannedTrunks(repositoryRoot),
		checkRequiredFiles(repositoryRoot, requiredSurfaces),
		checkMonorepoIndex(repositoryRoot),
		checkTestPlacement(repositoryRoot),
		checkPhaseMatrix(repositoryRoot),
		checkRetiredManifestAuthorityReferences(repositoryRoot),
		checkConfiguredGeneratorGate(repositoryRoot),
	]);
	const issues = Object.freeze(
		issueGroups
			.flat()
			.sort((left, right) => compareText(left.path, right.path)),
	);
	return Object.freeze({
		schema: GENERATOR_GOVERNANCE_CONVERGENCE_SCHEMA,
		monorepoIndexPath: MONOREPO_INDEX_PATH,
		testRoot: TEST_ROOT,
		bannedTrunks: BANNED_TRUNKS,
		requiredSurfaces,
		summary: createSummary(issues, requiredSurfaces),
		issues,
	});
};
