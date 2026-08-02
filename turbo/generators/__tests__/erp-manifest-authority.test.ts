import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import {
	captureRepositoryState,
	compareRepositoryStates,
} from "../engine/repository-state.ts";
import type { DiscoveredWorkspace } from "../engine/workspace-discovery.ts";
import {
	createErpManifestAuthorityDoctorExtension,
	createErpManifestAuthorityReport,
	discoverErpManifestAuthorityReport,
	projectErpManifestAuthority,
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
						id: "canonical",
						name: "@afenda/canonical",
						packagePath: "packages/erp/canonical",
						expectedExportName: "canonicalModuleManifest",
						manifestPath:
							"packages/erp/canonical/src/composition/module.manifest.ts",
						packageAuthorizationPath: null,
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
						id: "duplicate-conflict",
						name: "@afenda/duplicate-conflict",
						packagePath: "packages/erp/duplicate-conflict",
						expectedExportName: "duplicateConflictModuleManifest",
						manifestPath:
							"packages/erp/duplicate-conflict/src/composition/module.manifest.ts",
						packageAuthorizationPath: null,
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
						id: "duplicate-identical",
						name: "@afenda/duplicate-identical",
						packagePath: "packages/erp/duplicate-identical",
						expectedExportName: "duplicateIdenticalModuleManifest",
						manifestPath:
							"packages/erp/duplicate-identical/src/composition/module.manifest.ts",
						packageAuthorizationPath: null,
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
						id: "historical",
						name: "@afenda/historical",
						packagePath: "packages/erp/historical",
						expectedExportName: "historicalModuleManifest",
						manifestPath: "packages/erp/historical/src/module.manifest.ts",
						packageAuthorizationPath: null,
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
						id: "missing",
						name: "@afenda/missing",
						packagePath: "packages/erp/missing",
						expectedExportName: "missingModuleManifest",
						manifestPath: null,
						packageAuthorizationPath: null,
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

	it("keeps ERP manifest discovery read-only", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-manifest-read-only-"),
		);
		try {
			await writeFixtureFile(
				repositoryRoot,
				"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
				"edges: []\n",
			);
			await Promise.all(
				[
					"accounting",
					"fulfillment",
					"inventory",
					"master-data",
					"payables",
					"payments",
					"purchasing",
					"receivables",
					"receiving",
					"sales",
				].map((moduleName) =>
					writeFixtureFile(
						repositoryRoot,
						`packages/erp/${moduleName}/src/module.manifest.ts`,
					),
				),
			);
			await Promise.all(
				["corporate-administration", "human-resources", "payroll"].map(
					(moduleName) =>
						writeFixtureFile(
							repositoryRoot,
							`packages/erp/${moduleName}/src/composition/module.manifest.ts`,
						),
				),
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
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("projects historical manifests into the canonical composition path", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-manifest-projection-"),
		);
		try {
			await writeFixtureFile(
				repositoryRoot,
				"package.json",
				'{"private":true}\n',
			);
			await writeFixtureFile(
				repositoryRoot,
				"pnpm-workspace.yaml",
				'packages:\n  - "packages/erp/*"\n',
			);
			await writeFixtureFile(repositoryRoot, "turbo.json", "{}\n");
			await writeFixtureFile(
				repositoryRoot,
				"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
				"edges: []\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/inventory/package.json",
				'{"name":"@afenda/inventory","private":true,"type":"module","exports":{"./module-manifest":{"types":"./src/module.manifest.ts","default":"./src/module.manifest.ts"}}}\n',
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/inventory/src/module.manifest.ts",
				'import type { AfendaModuleManifest } from "@afenda/db/module-manifest";\nimport { INVENTORY_COMMAND_IDS } from "./operation-registry";\nexport const inventoryModuleManifest = { id: "inventory", packageName: "@afenda/inventory", commands: [...INVENTORY_COMMAND_IDS] } as const satisfies AfendaModuleManifest;\n',
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/inventory/src/authorization.ts",
				'import { inventoryModuleManifest } from "./module.manifest";\n',
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/inventory/__tests__/manifest.test.ts",
				'import { inventoryModuleManifest } from "../src/module.manifest";\nconst path = "src/module.manifest.ts";\n',
			);

			const first = await projectErpManifestAuthority({
				repositoryRoot,
				write: true,
			});
			const second = await projectErpManifestAuthority({
				repositoryRoot,
				write: false,
			});

			expect(first.changed).toEqual([
				"packages/erp/inventory/__tests__/manifest.test.ts",
				"packages/erp/inventory/package.json",
				"packages/erp/inventory/src/authorization.ts",
				"packages/erp/inventory/src/composition/module.manifest.ts",
				"packages/erp/inventory/src/module.manifest.ts",
			]);
			expect(second.changed).toEqual([]);
			await expect(
				readFile(
					resolve(
						repositoryRoot,
						"packages/erp/inventory/src/module.manifest.ts",
					),
					"utf8",
				),
			).rejects.toThrow();
			await expect(
				readFile(
					resolve(
						repositoryRoot,
						"packages/erp/inventory/src/composition/module.manifest.ts",
					),
					"utf8",
				),
			).resolves.toContain('from "../operation-registry"');
			await expect(
				readFile(
					resolve(
						repositoryRoot,
						"packages/erp/inventory/src/authorization.ts",
					),
					"utf8",
				),
			).resolves.toContain('from "./composition/module.manifest"');
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("proves live projection is byte-stable for inventory, human-resources, corporate-administration, and all compatible ERP packages", async () => {
		const repositoryRoot = process.cwd();
		const report = await discoverErpManifestAuthorityReport(repositoryRoot);
		const projection = await projectErpManifestAuthority({
			repositoryRoot,
			write: false,
		});
		const byId = new Map(
			report.workspaces.map((workspace) => [workspace.id, workspace]),
		);

		expect(byId.get("inventory")?.state).toBe("canonical");
		expect(byId.get("human-resources")?.state).toBe("canonical");
		expect(byId.get("corporate-administration")?.state).toBe("canonical");
		expect(report.summary).toEqual({
			total: 13,
			canonical: 13,
			historical: 0,
			missing: 0,
			duplicateIdentical: 0,
			duplicateConflict: 0,
		});
		expect(projection.changed).toEqual([]);
		expect(projection.unchanged).toHaveLength(13);
	});
});
