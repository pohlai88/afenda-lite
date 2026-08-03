import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import {
	captureRepositoryState,
	compareRepositoryStates,
} from "../engine/repository-state.ts";
import type { DiscoveredWorkspace } from "../engine/workspace-discovery.ts";
import {
	createErpLayoutAuthorityDoctorExtension,
	createErpLayoutAuthorityReport,
} from "../erp-generator/layout-authority.ts";

const createWorkspace = (
	path: string,
	name = `@afenda/${path.split("/").at(-1) ?? "unknown"}`,
): DiscoveredWorkspace =>
	Object.freeze({
		classification: Object.freeze({ kind: "generator-family", family: "erp" }),
		moduleType: "module",
		name,
		path,
		private: true,
	});

const writeFixtureFile = async (
	repositoryRoot: string,
	path: string,
	contents = "export const value = true;\n",
): Promise<void> => {
	const absolutePath = resolve(repositoryRoot, path);
	await mkdir(resolve(absolutePath, ".."), { recursive: true });
	await writeFile(absolutePath, contents, "utf8");
};

describe("ERP layout authority discovery", () => {
	it("classifies feature-first, historical-root, hybrid, and empty ERP layouts", async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), "afenda-erp-layout-"));
		try {
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/feature-first/src/features/orders/index.ts",
				'import { compose } from "../../composition/module.manifest";\nexport const value = compose;\n',
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/feature-first/src/kernel/operations/registry.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/feature-first/src/composition/module.manifest.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/feature-first/src/facade/public-api.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/feature-first/scripts/feature-first-layout.mjs",
				"export {};\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/historical-root/src/drizzle-store.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/historical-root/src/memory-store.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/historical-root/src/index.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/hybrid/src/features/reconcile/index.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/hybrid/src/store.ts",
			);

			const report = await createErpLayoutAuthorityReport({
				repositoryRoot,
				workspaces: [
					createWorkspace("packages/erp/empty"),
					createWorkspace("packages/erp/feature-first"),
					createWorkspace("packages/erp/historical-root"),
					createWorkspace("packages/erp/hybrid"),
					createWorkspace("packages/erp/wrong-root", "@afenda/expected-root"),
				],
			});

			expect(report).toEqual({
				schema: "afenda.erp-layout-authority/v1",
				targetLayout: "feature-first-erp",
				summary: {
					total: 5,
					featureFirst: 1,
					featureGroups: 0,
					historicalRoot: 1,
					hybrid: 1,
					empty: 2,
					rootNameMismatches: 1,
					upwardFeatureImports: 1,
					localLayoutScripts: 1,
				},
				workspaces: [
					expect.objectContaining({
						id: "empty",
						layoutClass: "empty",
						rootNameMatchesPackage: true,
					}),
					expect.objectContaining({
						id: "feature-first",
						layoutClass: "feature-first",
						featureDirectories: [
							"packages/erp/feature-first/src/features/orders",
						],
						localLayoutScripts: [
							"packages/erp/feature-first/scripts/feature-first-layout.mjs",
						],
						publicApiInventory: [
							"packages/erp/feature-first/src/facade/public-api.ts",
						],
						upwardFeatureImports: [
							"packages/erp/feature-first/src/features/orders/index.ts",
						],
					}),
					expect.objectContaining({
						id: "historical-root",
						layoutClass: "historical-root",
						rootStoreFiles: [
							"packages/erp/historical-root/src/drizzle-store.ts",
							"packages/erp/historical-root/src/memory-store.ts",
						],
						publicApiInventory: ["packages/erp/historical-root/src/index.ts"],
					}),
					expect.objectContaining({
						id: "hybrid",
						layoutClass: "hybrid",
						featureDirectories: ["packages/erp/hybrid/src/features/reconcile"],
						rootStoreFiles: ["packages/erp/hybrid/src/store.ts"],
					}),
					expect.objectContaining({
						id: "expected-root",
						layoutClass: "empty",
						rootNameMatchesPackage: false,
					}),
				],
			});
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("resolves grouped features to their leaf owners and measures imports from the feature root", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-layout-groups-"),
		);
		try {
			const group =
				"packages/erp/corporate-administration/src/features/agreement-administration";
			await writeFixtureFile(
				repositoryRoot,
				`${group}/group.definition.ts`,
				'export const AgreementAdministrationFeatureGroup = {\n\tid: "agreement-administration",\n} as const;\n',
			);
			// Reaches its own group directory only — inside src/features, so allowed.
			await writeFixtureFile(
				repositoryRoot,
				`${group}/service-subscriptions/index.ts`,
				'import { AgreementAdministrationFeatureGroup } from "../group.definition";\nexport const value = AgreementAdministrationFeatureGroup;\n',
			);
			// Nested capsule file reaching its own feature root — also allowed.
			await writeFixtureFile(
				repositoryRoot,
				`${group}/service-subscriptions/adapters/memory.ts`,
				'import { value } from "../index";\nexport const adapter = value;\n',
			);
			// Escapes src/features entirely — the real violation.
			await writeFixtureFile(
				repositoryRoot,
				`${group}/insurance/index.ts`,
				'import { compose } from "../../../composition/module.manifest";\nexport const value = compose;\n',
			);
			// An ungrouped feature keeps the flat one-level classification.
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/corporate-administration/src/features/company/index.ts",
			);

			const report = await createErpLayoutAuthorityReport({
				repositoryRoot,
				workspaces: [createWorkspace("packages/erp/corporate-administration")],
			});
			const [workspace] = report.workspaces;

			expect(workspace?.featureGroupDirectories).toEqual([group]);
			expect(workspace?.featureDirectories).toEqual([
				`${group}/insurance`,
				`${group}/service-subscriptions`,
				"packages/erp/corporate-administration/src/features/company",
			]);
			expect(workspace?.layoutClass).toBe("feature-first");
			expect(workspace?.upwardFeatureImports).toEqual([
				`${group}/insurance/index.ts`,
			]);
			expect(report.summary.featureGroups).toBe(1);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("keeps ERP layout discovery read-only", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-layout-read-only-"),
		);
		try {
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/inventory/src/drizzle-store.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/human-resources/src/features/leave/index.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/human-resources/src/kernel/operations/registry.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/human-resources/src/composition/module.manifest.ts",
			);
			const before = await captureRepositoryState(repositoryRoot);
			const report = await createErpLayoutAuthorityReport({
				repositoryRoot,
				workspaces: [
					createWorkspace("packages/erp/human-resources"),
					createWorkspace("packages/erp/inventory"),
				],
			});
			const after = await captureRepositoryState(repositoryRoot);

			expect(compareRepositoryStates(before, after)).toEqual({
				added: [],
				changed: [],
				removed: [],
				count: 0,
			});
			expect(report.summary).toEqual({
				total: 2,
				featureFirst: 1,
				featureGroups: 0,
				historicalRoot: 1,
				hybrid: 0,
				empty: 0,
				rootNameMismatches: 0,
				upwardFeatureImports: 0,
				localLayoutScripts: 0,
			});
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("emits fixed diagnostics for non-target layouts and superseded local scripts", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-layout-diagnostics-"),
		);
		try {
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/legacy/src/drizzle-store.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/feature/scripts/feature-first-layout.mjs",
				"export {};\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/feature/src/features/core/index.ts",
				'import { compose } from "../../composition/module.manifest";\nexport const value = compose;\n',
			);

			const extension = await createErpLayoutAuthorityDoctorExtension({
				repositoryRoot,
				workspaces: [
					createWorkspace("packages/erp/feature"),
					createWorkspace("packages/erp/legacy"),
					createWorkspace("packages/erp/wrong", "@afenda/right"),
				],
			});

			expect(extension.kind).toBe("erp-layout-authority");
			expect(extension.textLines).toContain("erp-layout-count=3");
			expect(extension.textLines).toContain("erp-layout-historical-root=1");
			expect(extension.diagnostics).toEqual([
				expect.objectContaining({
					code: "AFG-ERP-104",
					severity: "warning",
					treatment: "auto-upgrade",
					package: "@afenda/feature",
				}),
				expect.objectContaining({
					code: "AFG-ERP-103",
					severity: "warning",
					treatment: "remove-superseded",
					package: "@afenda/feature",
				}),
				expect.objectContaining({
					code: "AFG-ERP-102",
					severity: "warning",
					treatment: "auto-upgrade",
					package: "@afenda/legacy",
				}),
				expect.objectContaining({
					code: "AFG-ERP-101",
					severity: "blocked",
					treatment: "collision",
					package: "@afenda/right",
				}),
				expect.objectContaining({
					code: "AFG-ERP-102",
					severity: "warning",
					treatment: "auto-upgrade",
					package: "@afenda/right",
				}),
			]);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("diagnoses the live ERP layout convergence surface", async () => {
		const report = await createErpLayoutAuthorityReport({
			repositoryRoot: process.cwd(),
			workspaces: [
				createWorkspace("packages/erp/accounting"),
				createWorkspace("packages/erp/corporate-administration"),
				createWorkspace("packages/erp/fulfillment"),
				createWorkspace("packages/erp/human-resources"),
				createWorkspace("packages/erp/inventory"),
				createWorkspace("packages/erp/master-data"),
				createWorkspace("packages/erp/payables"),
				createWorkspace("packages/erp/payments"),
				createWorkspace("packages/erp/payroll"),
				createWorkspace("packages/erp/purchasing"),
				createWorkspace("packages/erp/receivables"),
				createWorkspace("packages/erp/receiving"),
				createWorkspace("packages/erp/sales"),
			],
		});

		expect(report.summary).toEqual({
			total: 13,
			featureFirst: 3,
			featureGroups: 0,
			historicalRoot: 10,
			hybrid: 0,
			empty: 0,
			rootNameMismatches: 0,
			upwardFeatureImports: 464,
			localLayoutScripts: 3,
		});
		expect(
			report.workspaces
				.filter((workspace) => workspace.layoutClass === "feature-first")
				.map((workspace) => workspace.id),
		).toEqual(["corporate-administration", "human-resources", "payroll"]);
	});
});
