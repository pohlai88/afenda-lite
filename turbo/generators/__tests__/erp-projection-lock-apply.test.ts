import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
	createGeneratorReconciliationPlan,
	type GeneratorReconciliationPlanV1,
} from "../engine/reconciliation-planner.ts";
import {
	applyErpProjectionLocks,
	ERP_PROJECTION_LOCK_APPLY_SCHEMA,
	ErpProjectionLockApplyError,
} from "../erp-generator/projection-lock-apply.ts";

const createPlan = (): GeneratorReconciliationPlanV1 =>
	createGeneratorReconciliationPlan({
		family: "erp",
		diagnostics: [
			{
				code: "AFG-ERP-201",
				severity: "warning",
				family: "erp",
				package: "@afenda/inventory",
				owner: "erp-generator projection lock authority",
				treatment: "auto-reconcile",
				paths: ["packages/erp/inventory/src/composition/generator.lock.json"],
				expected: {
					digest: "inventory-digest",
					lockPath:
						"packages/erp/inventory/src/composition/generator.lock.json",
				},
				actual: { lockExists: false },
			},
			{
				code: "AFG-ERP-102",
				severity: "warning",
				family: "erp",
				package: "@afenda/inventory",
				owner: "erp-generator layout authority",
				treatment: "auto-upgrade",
				paths: ["packages/erp/inventory"],
				expected: { layoutClass: "feature-first" },
				actual: { layoutClass: "historical-root" },
			},
		],
	});

describe("ERP projection lock apply", () => {
	it("writes only selected projection lock operations", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-lock-apply-"),
		);
		try {
			const result = await applyErpProjectionLocks({
				repositoryRoot,
				plan: createPlan(),
			});

			expect(result).toEqual({
				schema: ERP_PROJECTION_LOCK_APPLY_SCHEMA,
				writes: true,
				filesWritten: [
					"packages/erp/inventory/src/composition/generator.lock.json",
				],
				skipped: [],
			});
			const contents = await readFile(
				resolve(
					repositoryRoot,
					"packages/erp/inventory/src/composition/generator.lock.json",
				),
				"utf8",
			);
			expect(JSON.parse(contents)).toEqual({
				schema: "afenda.erp-projection-lock/v1",
				package: "@afenda/inventory",
				path: "packages/erp/inventory/src/composition/generator.lock.json",
				digest: "inventory-digest",
			});
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("skips matching existing locks on repeat apply", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-lock-repeat-"),
		);
		try {
			await applyErpProjectionLocks({ repositoryRoot, plan: createPlan() });
			const result = await applyErpProjectionLocks({
				repositoryRoot,
				plan: createPlan(),
			});

			expect(result).toEqual({
				schema: ERP_PROJECTION_LOCK_APPLY_SCHEMA,
				writes: true,
				filesWritten: [],
				skipped: ["packages/erp/inventory/src/composition/generator.lock.json"],
			});
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("refuses non-matching existing locks before writing any lock", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-erp-lock-conflict-"),
		);
		try {
			const conflictPath = resolve(
				repositoryRoot,
				"packages/erp/inventory/src/composition/generator.lock.json",
			);
			await mkdir(resolve(conflictPath, ".."), { recursive: true });
			await writeFile(conflictPath, '{"schema":"foreign"}\n', "utf8");

			await expect(
				applyErpProjectionLocks({ repositoryRoot, plan: createPlan() }),
			).rejects.toBeInstanceOf(ErpProjectionLockApplyError);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});
});
