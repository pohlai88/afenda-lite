import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
	applyErpFeatureScaffold,
	createErpFeatureScaffoldPlan,
	ERP_FEATURE_SCAFFOLD_SCHEMA,
	ErpFeatureScaffoldError,
} from "../erp-generator/feature-scaffold.ts";

describe("ERP feature scaffold", () => {
	it("creates a deterministic explicit feature plan", () => {
		const first = createErpFeatureScaffoldPlan({
			moduleId: "asset-maintenance",
			featureId: "work-order",
		});
		const second = createErpFeatureScaffoldPlan({
			moduleId: "asset-maintenance",
			featureId: "work-order",
		});

		expect(second).toEqual(first);
		expect(first).toEqual({
			schema: ERP_FEATURE_SCAFFOLD_SCHEMA,
			moduleId: "asset-maintenance",
			featureId: "work-order",
			groupId: null,
			packagePath: "packages/erp/asset-maintenance",
			groupPath: null,
			featurePath: "packages/erp/asset-maintenance/src/features/work-order",
			writes: false,
			files: expect.arrayContaining([
				expect.objectContaining({
					path: "packages/erp/asset-maintenance/src/features/work-order/index.ts",
				}),
				expect.objectContaining({
					path: "packages/erp/asset-maintenance/src/features/work-order/README.md",
				}),
				expect.objectContaining({
					path: "packages/erp/asset-maintenance/__tests__/asset-maintenance.work-order.feature.test.ts",
				}),
			]),
		});
		expect(first.files).toHaveLength(3);
	});

	it("writes only the declared feature files", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-feature-scaffold-"),
		);
		try {
			await mkdir(resolve(repositoryRoot, "packages/erp/asset-maintenance"), {
				recursive: true,
			});
			const result = await applyErpFeatureScaffold({
				repositoryRoot,
				spec: { moduleId: "asset-maintenance", featureId: "work-order" },
			});

			expect(result).toEqual({
				schema: ERP_FEATURE_SCAFFOLD_SCHEMA,
				featurePath: "packages/erp/asset-maintenance/src/features/work-order",
				groupPath: null,
				writes: true,
				filesWritten: createErpFeatureScaffoldPlan({
					moduleId: "asset-maintenance",
					featureId: "work-order",
				}).files.map((file) => file.path),
			});
			const feature = await readFile(
				resolve(
					repositoryRoot,
					"packages/erp/asset-maintenance/src/features/work-order/index.ts",
				),
				"utf8",
			);
			expect(feature).toContain('id: "work-order"');
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("refuses missing packages and feature collisions before writing", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-feature-scaffold-collision-"),
		);
		try {
			await expect(
				applyErpFeatureScaffold({
					repositoryRoot,
					spec: { moduleId: "asset-maintenance", featureId: "work-order" },
				}),
			).rejects.toBeInstanceOf(ErpFeatureScaffoldError);
			await mkdir(
				resolve(
					repositoryRoot,
					"packages/erp/asset-maintenance/src/features/work-order",
				),
				{ recursive: true },
			);
			await expect(
				applyErpFeatureScaffold({
					repositoryRoot,
					spec: { moduleId: "asset-maintenance", featureId: "work-order" },
				}),
			).rejects.toBeInstanceOf(ErpFeatureScaffoldError);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("nests grouped features and projects group membership", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-feature-scaffold-group-"),
		);
		try {
			await mkdir(
				resolve(repositoryRoot, "packages/erp/corporate-administration"),
				{ recursive: true },
			);
			const first = await applyErpFeatureScaffold({
				repositoryRoot,
				spec: {
					moduleId: "corporate-administration",
					groupId: "agreement-administration",
					featureId: "service-subscriptions",
				},
			});

			expect(first.featurePath).toBe(
				"packages/erp/corporate-administration/src/features/agreement-administration/service-subscriptions",
			);
			expect(first.groupPath).toBe(
				"packages/erp/corporate-administration/src/features/agreement-administration",
			);

			const groupDefinitionPath = resolve(
				repositoryRoot,
				"packages/erp/corporate-administration/src/features/agreement-administration/group.definition.ts",
			);
			expect(await readFile(groupDefinitionPath, "utf8")).toBe(
				'export const AgreementAdministrationFeatureGroup = {\n\tid: "agreement-administration",\n\tlabel: "Agreement Administration",\n\tfeatures: [\n\t\t"service-subscriptions",\n\t],\n} as const;\n',
			);

			// The membership projection is regenerated from the full member set, so
			// a second feature joins the existing group rather than forking it.
			await applyErpFeatureScaffold({
				repositoryRoot,
				spec: {
					moduleId: "corporate-administration",
					groupId: "agreement-administration",
					featureId: "insurance",
				},
			});
			expect(await readFile(groupDefinitionPath, "utf8")).toBe(
				'export const AgreementAdministrationFeatureGroup = {\n\tid: "agreement-administration",\n\tlabel: "Agreement Administration",\n\tfeatures: [\n\t\t"insurance",\n\t\t"service-subscriptions",\n\t],\n} as const;\n',
			);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("refuses to add features onto a hand-edited group membership projection", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-feature-scaffold-group-drift-"),
		);
		try {
			await mkdir(
				resolve(repositoryRoot, "packages/erp/corporate-administration"),
				{ recursive: true },
			);
			await applyErpFeatureScaffold({
				repositoryRoot,
				spec: {
					moduleId: "corporate-administration",
					groupId: "records-administration",
					featureId: "evidence-packs",
				},
			});
			await writeFile(
				resolve(
					repositoryRoot,
					"packages/erp/corporate-administration/src/features/records-administration/group.definition.ts",
				),
				"export const Hand = {} as const;\n",
				"utf8",
			);

			await expect(
				applyErpFeatureScaffold({
					repositoryRoot,
					spec: {
						moduleId: "corporate-administration",
						groupId: "records-administration",
						featureId: "document-register",
					},
				}),
			).rejects.toBeInstanceOf(ErpFeatureScaffoldError);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("rejects a grouped feature that already exists ungrouped", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-feature-scaffold-group-collision-"),
		);
		try {
			await mkdir(
				resolve(
					repositoryRoot,
					"packages/erp/corporate-administration/src/features/premises",
				),
				{ recursive: true },
			);

			await expect(
				applyErpFeatureScaffold({
					repositoryRoot,
					spec: {
						moduleId: "corporate-administration",
						groupId: "premises-administration",
						featureId: "premises",
					},
				}),
			).rejects.toBeInstanceOf(ErpFeatureScaffoldError);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("rejects non-canonical names", () => {
		expect(() =>
			createErpFeatureScaffoldPlan({
				moduleId: "AssetMaintenance",
				featureId: "work-order",
			}),
		).toThrow(ErpFeatureScaffoldError);
		expect(() =>
			createErpFeatureScaffoldPlan({
				moduleId: "asset-maintenance",
				featureId: "WorkOrder",
			}),
		).toThrow(ErpFeatureScaffoldError);
		expect(() =>
			createErpFeatureScaffoldPlan({
				moduleId: "asset-maintenance",
				featureId: "work-order",
				groupId: "WorkOrders",
			}),
		).toThrow(ErpFeatureScaffoldError);
		expect(() =>
			createErpFeatureScaffoldPlan({
				moduleId: "asset-maintenance",
				featureId: "work-order",
				groupId: "work-order",
			}),
		).toThrow(ErpFeatureScaffoldError);
	});
});
