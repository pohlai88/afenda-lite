import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
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
			packagePath: "packages/erp/asset-maintenance",
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
	});
});
