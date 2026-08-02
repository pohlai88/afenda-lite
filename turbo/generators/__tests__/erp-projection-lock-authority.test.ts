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
	createErpProjectionLockAuthorityDoctorExtension,
	createErpProjectionLockAuthorityReport,
} from "../erp-generator/projection-lock-authority.ts";

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

describe("ERP projection lock authority", () => {
	it("computes stable normalized input digests and expected package lock paths", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-projection-lock-"),
		);
		try {
			await writeFixtureFile(
				repositoryRoot,
				"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
				"edges:\r\n  - from: sales\r\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/sales/src/composition/module.manifest.ts",
				"export const salesModuleManifest = true;\r\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/sales/src/operation-registry.ts",
				"export const SALES_OPERATION_IDS = [] as const;\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/sales/src/index.ts",
				"export { salesModuleManifest } from './composition/module.manifest';\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/sales/src/drizzle-store.ts",
			);

			const first = await createErpProjectionLockAuthorityReport({
				repositoryRoot,
				workspaces: [createWorkspace("packages/erp/sales")],
			});
			const second = await createErpProjectionLockAuthorityReport({
				repositoryRoot,
				workspaces: [createWorkspace("packages/erp/sales")],
			});
			const [workspace] = first.workspaces;

			expect(first).toEqual(second);
			expect(first.summary).toEqual({
				total: 1,
				locksExisting: 0,
				locksMissing: 1,
				normative: 1,
				informational: 2,
			});
			expect(workspace?.lockPath).toBe(
				"packages/erp/sales/src/composition/generator.lock.json",
			);
			expect(workspace?.digest).toMatch(/^[a-f0-9]{64}$/);
			expect(workspace?.projections.map((projection) => projection.id)).toEqual(
				["module-manifest", "public-api-inventory", "layout-convergence"],
			);
			expect(workspace?.projections[0]).toEqual(
				expect.objectContaining({
					compliance: "normative",
					outputPath: "packages/erp/sales/src/composition/module.manifest.ts",
				}),
			);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("keeps projection lock discovery read-only", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-projection-lock-read-only-"),
		);
		try {
			await writeFixtureFile(
				repositoryRoot,
				"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
				"edges: []\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/inventory/src/composition/module.manifest.ts",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/inventory/src/index.ts",
			);
			const before = await captureRepositoryState(repositoryRoot);
			const report = await createErpProjectionLockAuthorityReport({
				repositoryRoot,
				workspaces: [createWorkspace("packages/erp/inventory")],
			});
			const after = await captureRepositoryState(repositoryRoot);

			expect(compareRepositoryStates(before, after)).toEqual({
				added: [],
				changed: [],
				removed: [],
				count: 0,
			});
			expect(report.summary.locksMissing).toBe(1);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("emits fixed auto-reconcile diagnostics for missing projection locks", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-projection-lock-diagnostics-"),
		);
		try {
			await writeFixtureFile(
				repositoryRoot,
				"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml",
				"edges: []\n",
			);
			await writeFixtureFile(
				repositoryRoot,
				"packages/erp/payables/src/composition/module.manifest.ts",
			);

			const extension = await createErpProjectionLockAuthorityDoctorExtension({
				repositoryRoot,
				workspaces: [createWorkspace("packages/erp/payables")],
			});

			expect(extension.kind).toBe("erp-projection-lock-authority");
			expect(extension.textLines).toContain("erp-projection-lock-count=1");
			expect(extension.textLines).toContain("erp-projection-lock-missing=1");
			expect(extension.diagnostics).toEqual([
				expect.objectContaining({
					code: "AFG-ERP-201",
					severity: "warning",
					treatment: "auto-reconcile",
					package: "@afenda/payables",
					paths: ["packages/erp/payables/src/composition/generator.lock.json"],
				}),
			]);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("diagnoses the live ERP projection-lock surface", async () => {
		const report = await createErpProjectionLockAuthorityReport({
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
			locksExisting: 0,
			locksMissing: 13,
			normative: 13,
			informational: 26,
		});
		expect(
			report.workspaces.every((workspace) =>
				workspace.projections.every((projection) =>
					/^[a-f0-9]{64}$/.test(projection.digest),
				),
			),
		).toBe(true);
	});
});
