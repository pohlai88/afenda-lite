import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
	applyErpPackageScaffold,
	createErpPackageScaffoldPlan,
	ERP_PACKAGE_SCAFFOLD_SCHEMA,
	ErpPackageScaffoldError,
} from "../erp-generator/package-scaffold.ts";

describe("ERP package scaffold", () => {
	it("creates a deterministic explicit package plan", () => {
		const first = createErpPackageScaffoldPlan({
			moduleId: "asset-maintenance",
			category: "operations",
		});
		const second = createErpPackageScaffoldPlan({
			moduleId: "asset-maintenance",
			category: "operations",
		});

		expect(second).toEqual(first);
		expect(first).toEqual({
			schema: ERP_PACKAGE_SCAFFOLD_SCHEMA,
			moduleId: "asset-maintenance",
			packageName: "@afenda/asset-maintenance",
			packagePath: "packages/erp/asset-maintenance",
			writes: false,
			files: expect.arrayContaining([
				expect.objectContaining({
					path: "packages/erp/asset-maintenance/package.json",
				}),
				expect.objectContaining({
					path: "packages/erp/asset-maintenance/src/composition/module.manifest.ts",
				}),
				expect.objectContaining({
					path: "packages/erp/asset-maintenance/__tests__/asset-maintenance.scaffold.test.ts",
				}),
			]),
		});
		expect(first.files).toHaveLength(13);
		expect(
			first.files.every((file) =>
				file.path.startsWith("packages/erp/asset-maintenance/"),
			),
		).toBe(true);
	});

	it("writes only the declared files into a new package directory", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-scaffold-"),
		);
		try {
			const result = await applyErpPackageScaffold({
				repositoryRoot,
				spec: { moduleId: "asset-maintenance", category: "operations" },
			});

			expect(result).toEqual({
				schema: ERP_PACKAGE_SCAFFOLD_SCHEMA,
				packagePath: "packages/erp/asset-maintenance",
				writes: true,
				filesWritten: createErpPackageScaffoldPlan({
					moduleId: "asset-maintenance",
					category: "operations",
				}).files.map((file) => file.path),
			});
			const manifest = await readFile(
				resolve(
					repositoryRoot,
					"packages/erp/asset-maintenance/src/composition/module.manifest.ts",
				),
				"utf8",
			);
			expect(manifest).toContain('id: "asset-maintenance"');
			expect(manifest).toContain('packageName: "@afenda/asset-maintenance"');
			expect(manifest).toContain('category: "operations"');
			expect(manifest).toContain('} from "../kernel"');
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("materializes the mandatory feature-first topology", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-scaffold-topology-"),
		);
		try {
			await applyErpPackageScaffold({
				repositoryRoot,
				spec: { moduleId: "asset-maintenance", category: "operations" },
			});

			const packagePath = "packages/erp/asset-maintenance";
			const directories = [
				`${packagePath}/src/facade`,
				`${packagePath}/src/kernel`,
				`${packagePath}/src/composition`,
				`${packagePath}/src/features`,
				`${packagePath}/src/testing`,
				`${packagePath}/scripts`,
				`${packagePath}/__tests__`,
			];
			const materialized = await Promise.all(
				directories.map(async (directory) => ({
					directory,
					isDirectory: (
						await stat(resolve(repositoryRoot, directory))
					).isDirectory(),
				})),
			);
			expect(materialized).toEqual(
				directories.map((directory) => ({ directory, isDirectory: true })),
			);

			// The root is the sole production entrypoint and delegates to the facade;
			// package-wide registries live under kernel, never as root layer files.
			const index = await readFile(
				resolve(repositoryRoot, `${packagePath}/src/index.ts`),
				"utf8",
			);
			expect(index).toContain('import "server-only"');
			expect(index).toContain('from "./facade/public-api"');
			await expect(
				stat(
					resolve(repositoryRoot, `${packagePath}/src/operation-registry.ts`),
				),
			).rejects.toThrow();
			await expect(
				stat(resolve(repositoryRoot, `${packagePath}/src/permissions.ts`)),
			).rejects.toThrow();
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("refuses collisions before writing", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-scaffold-collision-"),
		);
		try {
			await mkdir(resolve(repositoryRoot, "packages/erp/asset-maintenance"), {
				recursive: true,
			});

			await expect(
				applyErpPackageScaffold({
					repositoryRoot,
					spec: { moduleId: "asset-maintenance", category: "operations" },
				}),
			).rejects.toBeInstanceOf(ErpPackageScaffoldError);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("rejects non-canonical names", () => {
		expect(() =>
			createErpPackageScaffoldPlan({
				moduleId: "AssetMaintenance",
				category: "operations",
			}),
		).toThrow(ErpPackageScaffoldError);
		expect(() =>
			createErpPackageScaffoldPlan({
				moduleId: "asset-maintenance",
				category: "Operations",
			}),
		).toThrow(ErpPackageScaffoldError);
	});
});
