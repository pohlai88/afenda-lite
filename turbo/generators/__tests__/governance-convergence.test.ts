import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import {
	createGeneratorGovernanceConvergenceReport,
	GENERATOR_GOVERNANCE_CONVERGENCE_SCHEMA,
} from "../engine/governance-convergence.ts";
import {
	captureRepositoryState,
	compareRepositoryStates,
} from "../engine/repository-state.ts";

const writeFixtureFile = async (
	repositoryRoot: string,
	path: string,
	contents = "fixture\n",
): Promise<void> => {
	const absolutePath = resolve(repositoryRoot, path);
	await mkdir(resolve(absolutePath, ".."), { recursive: true });
	await writeFile(absolutePath, contents, "utf8");
};

const requiredContractDocs = Object.freeze([
	"docs-V2/monorepo/g1-erp-manifest-authority-contract.md",
	"docs-V2/monorepo/g2-erp-layout-convergence-contract.md",
	"docs-V2/monorepo/g3-erp-projection-lock-contract.md",
	"docs-V2/monorepo/g4-explicit-erp-spec-contract.md",
	"docs-V2/monorepo/g5-versioned-treatment-recovery-contract.md",
	"docs-V2/monorepo/g6-kernel-package-adoption-contract.md",
	"docs-V2/monorepo/g7-repo-documentation-governance-convergence-contract.md",
	"docs-V2/monorepo/g8-generator-phase-exit-convergence-contract.md",
] as const);

const requiredAuthoritySources = Object.freeze([
	"turbo/generators/erp-generator/manifest-authority.ts",
	"turbo/generators/erp-generator/layout-authority.ts",
	"turbo/generators/erp-generator/projection-lock-authority.ts",
	"turbo/generators/erp-generator/explicit-spec.ts",
	"turbo/generators/erp-generator/treatment-authority.ts",
	"turbo/generators/kernel-generator/adoption-authority.ts",
	"turbo/generators/engine/governance-convergence.ts",
] as const);

const requiredTests = Object.freeze([
	"turbo/generators/__tests__/erp-manifest-authority.test.ts",
	"turbo/generators/__tests__/erp-layout-authority.test.ts",
	"turbo/generators/__tests__/erp-projection-lock-authority.test.ts",
	"turbo/generators/__tests__/erp-explicit-spec.test.ts",
	"turbo/generators/__tests__/erp-treatment-authority.test.ts",
	"turbo/generators/__tests__/kernel-adoption-authority.test.ts",
	"turbo/generators/__tests__/governance-convergence.test.ts",
] as const);

const phaseMatrixFixture = `
| Slice | Contract | Implementation | Tests | Executable gate | Docs aligned | Commit | Status |
|-------|----------|----------------|-------|-----------------|--------------|--------|--------|
| \`G0.x\` | Present | Complete | Passing | Present | Aligned | Committed | Sealed |
| \`G1\` | Present | Complete | Present | Governed | Aligned | Committed | Sealed |
| \`G2\` | Present | Complete | Present | Governed | Aligned | Uncommitted | Pending seal |
| \`G3\` | Present | Complete | Present | Governed | Aligned | Uncommitted | Pending seal |
| \`G4\` | Present | Complete | Present | Governed | Aligned | Uncommitted | Pending seal |
| \`G5\` | Present | Complete | Present | Governed | Aligned | Uncommitted | Pending seal |
| \`G6\` | Present | Complete | Present | Governed | Aligned | Uncommitted | Pending seal |
| \`G7\` | Present | Complete | Present | Authority | Aligned | Uncommitted | Pending seal |
| \`G8\` | Present | Read-only | Required | Phase-exit gate | Required | Separate | In progress |

\`LIVING_ERP_MANIFEST_PACKAGES\` is retired and must not be reintroduced
`.trim();

const writeCompleteGovernanceFixture = async (
	repositoryRoot: string,
): Promise<void> => {
	await Promise.all(
		[
			...requiredContractDocs,
			...requiredAuthoritySources,
			...requiredTests,
		].map((path) => writeFixtureFile(repositoryRoot, path)),
	);
	await writeFixtureFile(
		repositoryRoot,
		"docs-V2/monorepo/g8-generator-phase-exit-convergence-contract.md",
		phaseMatrixFixture,
	);
	await writeFixtureFile(
		repositoryRoot,
		"docs-V2/monorepo/README.md",
		requiredContractDocs
			.map((path) => path.replace("docs-V2/monorepo/", ""))
			.join("\n"),
	);
	await writeFixtureFile(
		repositoryRoot,
		"docs-V2/modules/PACKAGE-GOVERNANCE.md",
		"ERP manifest package authority is derived from the generator-owned manifest authority projection. `LIVING_ERP_MANIFEST_PACKAGES` is retired.\n",
	);
	await writeFixtureFile(
		repositoryRoot,
		"package.json",
		'{ "scripts": { "generator:check": "tsx turbo/generators/engine/generator-check.ts" } }\n',
	);
	await writeFixtureFile(
		repositoryRoot,
		"turbo.json",
		'{ "tasks": { "//#generator:check": { "inputs": ["$TURBO_ROOT$/docs-V2/monorepo/**", "$TURBO_ROOT$/docs-V2/modules/PACKAGE-GOVERNANCE.md"], "outputs": [] } } }\n',
	);
};

describe("generator governance convergence", () => {
	it("reports a deterministic clean convergence surface for complete fixtures", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-generator-governance-"),
		);
		try {
			await writeCompleteGovernanceFixture(repositoryRoot);
			const first = await createGeneratorGovernanceConvergenceReport({
				repositoryRoot,
			});
			const second = await createGeneratorGovernanceConvergenceReport({
				repositoryRoot,
			});

			expect(second).toEqual(first);
			expect(first).toEqual({
				schema: GENERATOR_GOVERNANCE_CONVERGENCE_SCHEMA,
				monorepoIndexPath: "docs-V2/monorepo/README.md",
				testRoot: "turbo/generators/__tests__",
				bannedTrunks: ["docs", "doc"],
				requiredSurfaces: first.requiredSurfaces,
				summary: {
					issues: 0,
					warnings: 0,
					blocked: 0,
					contractDocs: 8,
					authoritySources: 7,
					tests: 7,
				},
				issues: [],
			});
			expect(first.requiredSurfaces).toHaveLength(26);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("keeps convergence reporting read-only", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-generator-governance-read-only-"),
		);
		try {
			await writeCompleteGovernanceFixture(repositoryRoot);
			const before = await captureRepositoryState(repositoryRoot);
			await createGeneratorGovernanceConvergenceReport({ repositoryRoot });
			const after = await captureRepositoryState(repositoryRoot);

			expect(compareRepositoryStates(before, after)).toEqual({
				added: [],
				changed: [],
				removed: [],
				count: 0,
			});
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("flags banned trunks, missing docs, missing README links, and misplaced tests", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-generator-governance-failures-"),
		);
		try {
			await writeCompleteGovernanceFixture(repositoryRoot);
			await mkdir(resolve(repositoryRoot, "docs"), { recursive: true });
			await writeFixtureFile(
				repositoryRoot,
				"turbo/generators/erp-generator/bad.test.ts",
			);
			await rm(
				resolve(
					repositoryRoot,
					"docs-V2/monorepo/g6-kernel-package-adoption-contract.md",
				),
				{ force: true },
			);
			await writeFixtureFile(
				repositoryRoot,
				"docs-V2/monorepo/README.md",
				"g1-erp-manifest-authority-contract.md\n",
			);

			const report = await createGeneratorGovernanceConvergenceReport({
				repositoryRoot,
			});

			expect(report.summary.blocked).toBe(2);
			expect(report.summary.warnings).toBeGreaterThanOrEqual(7);
			expect(report.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						code: "AFG-GOV-001",
						severity: "blocked",
						path: "docs",
					}),
					expect.objectContaining({
						code: "AFG-GOV-003",
						severity: "warning",
						path: "docs-V2/monorepo/g6-kernel-package-adoption-contract.md",
					}),
					expect.objectContaining({
						code: "AFG-GOV-004",
						severity: "warning",
						path: "docs-V2/monorepo/README.md",
					}),
					expect.objectContaining({
						code: "AFG-GOV-007",
						severity: "blocked",
						path: "turbo/generators/erp-generator/bad.test.ts",
					}),
				]),
			);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("diagnoses the live generator governance surface", async () => {
		const report = await createGeneratorGovernanceConvergenceReport({
			repositoryRoot: process.cwd(),
		});

		expect(report.summary).toEqual({
			issues: 0,
			warnings: 0,
			blocked: 0,
			contractDocs: 8,
			authoritySources: 7,
			tests: 7,
		});
	});
});
