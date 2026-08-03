import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import {
	captureRepositoryState,
	compareRepositoryStates,
} from "../engine/repository-state.ts";
import {
	ErpExplicitSpecError,
	parseErpExplicitSpec,
	planErpExplicitSpec,
} from "../erp-generator/explicit-spec.ts";

const writeFixtureFile = async (
	repositoryRoot: string,
	path: string,
	contents = "export const value = true;\n",
): Promise<void> => {
	const absolutePath = resolve(repositoryRoot, path);
	await mkdir(resolve(absolutePath, ".."), { recursive: true });
	await writeFile(absolutePath, contents, "utf8");
};

const createPackageSpec = Object.freeze({
	kind: "create-package",
	moduleId: "asset-management",
	packageName: "@afenda/asset-management",
	description: "Asset management bounded context",
	features: [
		{
			id: "asset-register",
			operations: [
				{
					id: "asset-management.asset-register.create",
					kind: "command",
					permission: "asset_management.asset_register.create",
				},
			],
			publicExports: ["createAsset"],
		},
	],
	authorizedDependencies: ["@afenda/errors"],
});

const addFeatureSpec = Object.freeze({
	kind: "add-feature",
	moduleId: "inventory",
	feature: {
		id: "stock-adjustment",
		operations: [
			{
				id: "inventory.stock-adjustment.create",
				kind: "command",
				permission: "inventory.stock_adjustment.create",
			},
		],
		publicExports: ["createStockAdjustment"],
	},
});

describe("ERP explicit create/add-feature specs", () => {
	it("parses create-package specs and returns a deterministic dry-run plan", async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), "afenda-erp-create-"));
		try {
			const parsed = parseErpExplicitSpec(createPackageSpec);
			const plan = await planErpExplicitSpec({
				repositoryRoot,
				spec: createPackageSpec,
			});

			expect(parsed.kind).toBe("create-package");
			expect(plan).toEqual({
				schema: "afenda.erp-explicit-spec/v1",
				kind: "create-package",
				moduleId: "asset-management",
				packagePath: "packages/erp/asset-management",
				actions: [
					{
						kind: "create-directory",
						path: "packages/erp/asset-management",
					},
					{
						kind: "create-file",
						path: "packages/erp/asset-management/__tests__/package-contract.test.ts",
					},
					{
						kind: "create-file",
						path: "packages/erp/asset-management/package.json",
					},
					{
						kind: "create-file",
						path: "packages/erp/asset-management/src/composition/module.manifest.ts",
					},
					{
						kind: "create-directory",
						path: "packages/erp/asset-management/src/features/asset-register",
					},
					{
						kind: "create-file",
						path: "packages/erp/asset-management/src/features/asset-register/index.ts",
					},
					{
						kind: "create-file",
						path: "packages/erp/asset-management/src/features/asset-register/operation-registry.ts",
					},
					{
						kind: "create-file",
						path: "packages/erp/asset-management/src/index.ts",
					},
				],
			});
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("plans grouped features under their classification directory", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-create-grouped-"),
		);
		try {
			const plan = await planErpExplicitSpec({
				repositoryRoot,
				spec: {
					...createPackageSpec,
					features: [
						{
							...createPackageSpec.features[0],
							groupId: "resource-administration",
						},
					],
				},
			});

			expect(plan.actions).toEqual(
				expect.arrayContaining([
					{
						kind: "create-file",
						path: "packages/erp/asset-management/src/features/resource-administration/group.definition.ts",
					},
					{
						kind: "create-directory",
						path: "packages/erp/asset-management/src/features/resource-administration/asset-register",
					},
					{
						kind: "create-file",
						path: "packages/erp/asset-management/src/features/resource-administration/asset-register/index.ts",
					},
				]),
			);
			expect(plan.actions).not.toContainEqual({
				kind: "create-directory",
				path: "packages/erp/asset-management/src/features/asset-register",
			});
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("rejects a feature group that collides with an ungrouped feature name", () => {
		expect(() =>
			parseErpExplicitSpec({
				...createPackageSpec,
				features: [
					{
						...createPackageSpec.features[0],
						groupId: "premises-administration",
					},
					{
						id: "premises-administration",
						operations: [
							{
								id: "asset-management.premises-administration.create",
								kind: "command",
								permission: "asset_management.premises_administration.create",
							},
						],
						publicExports: ["createPremises"],
					},
				],
			}),
		).toThrow(ErpExplicitSpecError);
	});

	it("parses add-feature specs and rejects missing or existing package state before mutation", async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), "afenda-erp-add-"));
		try {
			await expect(
				planErpExplicitSpec({ repositoryRoot, spec: addFeatureSpec }),
			).rejects.toThrow(ErpExplicitSpecError);

			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/inventory/package.json",
				'{"name":"@afenda/inventory","private":true}\n',
			);
			const plan = await planErpExplicitSpec({
				repositoryRoot,
				spec: addFeatureSpec,
			});
			expect(plan).toEqual({
				schema: "afenda.erp-explicit-spec/v1",
				kind: "add-feature",
				moduleId: "inventory",
				packagePath: "packages/erp/inventory",
				actions: [
					{
						kind: "create-file",
						path: "packages/erp/inventory/__tests__/stock-adjustment.test.ts",
					},
					{
						kind: "update-file",
						path: "packages/erp/inventory/src/composition/module.manifest.ts",
					},
					{
						kind: "create-directory",
						path: "packages/erp/inventory/src/features/stock-adjustment",
					},
					{
						kind: "create-file",
						path: "packages/erp/inventory/src/features/stock-adjustment/index.ts",
					},
					{
						kind: "create-file",
						path: "packages/erp/inventory/src/features/stock-adjustment/operation-registry.ts",
					},
					{
						kind: "update-file",
						path: "packages/erp/inventory/src/index.ts",
					},
				],
			});

			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/inventory/src/features/stock-adjustment/index.ts",
			);
			await expect(
				planErpExplicitSpec({ repositoryRoot, spec: addFeatureSpec }),
			).rejects.toThrow("feature already exists");
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("rejects hostile paths, unauthorized package names, and case collisions", () => {
		expect(() =>
			parseErpExplicitSpec({
				...createPackageSpec,
				moduleId: "../escape",
				packageName: "@afenda/escape",
			}),
		).toThrow(ErpExplicitSpecError);
		expect(() =>
			parseErpExplicitSpec({
				...createPackageSpec,
				packageName: "@other/asset-management",
			}),
		).toThrow(ErpExplicitSpecError);
		expect(() =>
			parseErpExplicitSpec({
				...createPackageSpec,
				features: [
					createPackageSpec.features[0],
					{ ...createPackageSpec.features[0], id: "Asset-Register" },
				],
			}),
		).toThrow(ErpExplicitSpecError);
	});

	it("keeps dry-run planning read-only", async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), "afenda-erp-plan-ro-"));
		try {
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/inventory/package.json",
				'{"name":"@afenda/inventory","private":true}\n',
			);
			const before = await captureRepositoryState(repositoryRoot);
			await planErpExplicitSpec({ repositoryRoot, spec: addFeatureSpec });
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
});
