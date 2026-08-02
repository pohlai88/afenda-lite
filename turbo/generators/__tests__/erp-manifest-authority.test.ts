import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import {
	captureRepositoryState,
	compareRepositoryStates,
} from "../engine/repository-state.ts";
import type { DiscoveredWorkspace } from "../engine/workspace-discovery.ts";
import {
	createErpManifestAuthorityDoctorExtension,
	createErpManifestAuthorityReport,
} from "../erp-generator/manifest-authority.ts";

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

describe("ERP manifest authority discovery", () => {
	it("classifies canonical, historical, missing, and duplicate manifest authority states", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-manifest-authority-"),
		);
		try {
			await writeFixtureFile(
				repositoryRoot,
				"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
				"edges: []\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/canonical/src/composition/module.manifest.ts",
				"export const canonicalModuleManifest = true;\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/historical/src/module.manifest.ts",
				"export const historicalModuleManifest = true;\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/duplicate-identical/src/composition/module.manifest.ts",
				"export const duplicateIdenticalModuleManifest = true;\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/duplicate-identical/src/module.manifest.ts",
				"export const duplicateIdenticalModuleManifest = true;\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/duplicate-conflict/src/composition/module.manifest.ts",
				"export const duplicateConflictModuleManifest = true;\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/duplicate-conflict/src/module.manifest.ts",
				"export const duplicateConflictModuleManifest = false;\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/canonical/src/composition/module-definition.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/canonical/src/kernel/operations/registry.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/canonical/src/facade/public-api.ts",
			);

			const report = await createErpManifestAuthorityReport({
				repositoryRoot,
				workspaces: [
					createWorkspace("packages/erp/missing"),
					createWorkspace("packages/erp/duplicate-conflict"),
					createWorkspace("packages/erp/historical"),
					createWorkspace("packages/erp/duplicate-identical"),
					createWorkspace("packages/erp/canonical"),
					Object.freeze({
						...createWorkspace("packages/foundation/errors", "@afenda/errors"),
						classification: Object.freeze({
							kind: "generator-family",
							family: "kernel",
						}),
					}),
				],
			});

			expect(report).toEqual({
				schema: "afenda.erp-manifest-authority/v1",
				canonicalManifestPath: "src/composition/module.manifest.ts",
				historicalManifestPath: "src/module.manifest.ts",
				summary: {
					total: 5,
					canonical: 1,
					historical: 1,
					missing: 1,
					duplicateIdentical: 1,
					duplicateConflict: 1,
				},
				workspaces: [
					{
						name: "@afenda/canonical",
						packagePath: "packages/erp/canonical",
						expectedExportName: "canonicalModuleManifest",
						manifestPath:
							"packages/erp/canonical/src/composition/module.manifest.ts",
						state: "canonical",
						semanticInputs: {
							moduleDefinition: [
								"packages/erp/canonical/src/composition/module-definition.ts",
							],
							operationRegistry: [
								"packages/erp/canonical/src/kernel/operations/registry.ts",
							],
							packagePublicApi: [
								"packages/erp/canonical/src/facade/public-api.ts",
							],
							workspaceEdgeRegister: [
								"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
							],
						},
					},
					{
						name: "@afenda/duplicate-conflict",
						packagePath: "packages/erp/duplicate-conflict",
						expectedExportName: "duplicateConflictModuleManifest",
						manifestPath:
							"packages/erp/duplicate-conflict/src/composition/module.manifest.ts",
						state: "duplicate-conflict",
						semanticInputs: {
							moduleDefinition: [],
							operationRegistry: [],
							packagePublicApi: [],
							workspaceEdgeRegister: [
								"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
							],
						},
					},
					{
						name: "@afenda/duplicate-identical",
						packagePath: "packages/erp/duplicate-identical",
						expectedExportName: "duplicateIdenticalModuleManifest",
						manifestPath:
							"packages/erp/duplicate-identical/src/composition/module.manifest.ts",
						state: "duplicate-identical",
						semanticInputs: {
							moduleDefinition: [],
							operationRegistry: [],
							packagePublicApi: [],
							workspaceEdgeRegister: [
								"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
							],
						},
					},
					{
						name: "@afenda/historical",
						packagePath: "packages/erp/historical",
						expectedExportName: "historicalModuleManifest",
						manifestPath: "packages/erp/historical/src/module.manifest.ts",
						state: "historical",
						semanticInputs: {
							moduleDefinition: [],
							operationRegistry: [],
							packagePublicApi: [],
							workspaceEdgeRegister: [
								"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
							],
						},
					},
					{
						name: "@afenda/missing",
						packagePath: "packages/erp/missing",
						expectedExportName: "missingModuleManifest",
						manifestPath: null,
						state: "missing",
						semanticInputs: {
							moduleDefinition: [],
							operationRegistry: [],
							packagePublicApi: [],
							workspaceEdgeRegister: [
								"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
							],
						},
					},
				],
			});
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("emits fixed diagnostics for blocked manifest authority states", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-manifest-diagnostics-"),
		);
		try {
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/duplicate-conflict/src/composition/module.manifest.ts",
				"export const duplicateConflictModuleManifest = true;\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/duplicate-conflict/src/module.manifest.ts",
				"export const duplicateConflictModuleManifest = false;\n",
			);

			const extension = await createErpManifestAuthorityDoctorExtension({
				repositoryRoot,
				workspaces: [
					createWorkspace("packages/erp/duplicate-conflict"),
					createWorkspace("packages/erp/missing"),
				],
			});

			expect(extension.kind).toBe("erp-manifest-authority");
			expect(extension.textLines).toContain("erp-manifest-count=2");
			expect(extension.diagnostics).toEqual([
				expect.objectContaining({
					code: "AFG-ERP-002",
					severity: "blocked",
					treatment: "collision",
					package: "@afenda/duplicate-conflict",
				}),
				expect.objectContaining({
					code: "AFG-ERP-001",
					severity: "blocked",
					treatment: "semantic-decision-required",
					package: "@afenda/missing",
				}),
			]);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it(
		"keeps live repository ERP manifest discovery read-only",
		{ timeout: 30_000 },
		async () => {
			const repositoryRoot = resolve(
				dirname(fileURLToPath(import.meta.url)),
				"../../..",
			);
			const before = await captureRepositoryState(repositoryRoot);
			const report = await createErpManifestAuthorityReport({
				repositoryRoot,
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
			const after = await captureRepositoryState(repositoryRoot);

			expect(compareRepositoryStates(before, after)).toEqual({
				added: [],
				changed: [],
				removed: [],
				count: 0,
			});
			expect(report.summary.total).toBe(13);
			expect(report.summary.missing).toBe(0);
			expect(report.summary.duplicateConflict).toBe(0);
			expect(
				report.summary.canonical +
					report.summary.historical +
					report.summary.duplicateIdentical,
			).toBe(13);
		},
	);
});
