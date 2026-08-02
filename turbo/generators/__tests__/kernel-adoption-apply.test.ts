import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
	createGeneratorReconciliationPlan,
	type GeneratorReconciliationPlanV1,
} from "../engine/reconciliation-planner.ts";
import {
	applyKernelAdoptionTreatments,
	KERNEL_ADOPTION_APPLY_SCHEMA,
	KernelAdoptionApplyError,
} from "../kernel-generator/adoption-apply.ts";

const createPlan = (): GeneratorReconciliationPlanV1 =>
	createGeneratorReconciliationPlan({
		family: "kernel",
		diagnostics: [
			{
				code: "AFG-KERNEL-003",
				severity: "warning",
				family: "kernel",
				package: "@afenda/config",
				owner: "kernel-generator adoption authority",
				treatment: "auto-upgrade",
				paths: ["packages/foundation/config/src/index.ts"],
				expected: { rootEntrypoint: "src/index.ts" },
				actual: { rootEntrypointExists: false },
			},
			{
				code: "AFG-KERNEL-005",
				severity: "warning",
				family: "kernel",
				package: "@afenda/config",
				owner: "kernel-generator adoption authority",
				treatment: "auto-upgrade",
				paths: ["packages/foundation/config/package.json"],
				expected: { exports: ["."] },
				actual: { rootExportExists: false },
			},
			{
				code: "AFG-KERNEL-004",
				severity: "warning",
				family: "kernel",
				package: "@afenda/env",
				owner: "kernel-generator adoption authority",
				treatment: "auto-regenerate",
				paths: ["packages/foundation/env/CONTRACT.md"],
				expected: { contractPath: "CONTRACT.md" },
				actual: { contractExists: false },
			},
		],
	});

describe("kernel adoption apply", () => {
	it("applies contract, root entrypoint, and root export treatments", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-kernel-adoption-apply-"),
		);
		try {
			await mkdir(resolve(repositoryRoot, "packages/foundation/config"), {
				recursive: true,
			});
			await writeFile(
				resolve(repositoryRoot, "packages/foundation/config/package.json"),
				'{"name":"@afenda/config","exports":{"./biome.json":"./biome.json"}}\n',
				"utf8",
			);
			const result = await applyKernelAdoptionTreatments({
				repositoryRoot,
				plan: createPlan(),
			});

			expect(result).toEqual({
				schema: KERNEL_ADOPTION_APPLY_SCHEMA,
				writes: true,
				filesChanged: [
					"packages/foundation/config/package.json",
					"packages/foundation/config/src/index.ts",
					"packages/foundation/env/CONTRACT.md",
				],
				skipped: [],
			});
			const packageJson = JSON.parse(
				await readFile(
					resolve(repositoryRoot, "packages/foundation/config/package.json"),
					"utf8",
				),
			);
			expect(packageJson.exports["."]).toEqual({
				types: "./src/index.ts",
				default: "./src/index.ts",
			});
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("skips matching generated files and existing root exports on repeat apply", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-kernel-adoption-repeat-"),
		);
		try {
			await mkdir(resolve(repositoryRoot, "packages/foundation/config"), {
				recursive: true,
			});
			await writeFile(
				resolve(repositoryRoot, "packages/foundation/config/package.json"),
				'{"name":"@afenda/config","exports":{}}\n',
				"utf8",
			);
			await applyKernelAdoptionTreatments({
				repositoryRoot,
				plan: createPlan(),
			});
			const result = await applyKernelAdoptionTreatments({
				repositoryRoot,
				plan: createPlan(),
			});

			expect(result.filesChanged).toEqual([]);
			expect(result.skipped).toEqual([
				"packages/foundation/config/package.json",
				"packages/foundation/config/src/index.ts",
				"packages/foundation/env/CONTRACT.md",
			]);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("refuses non-matching generated files", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-kernel-adoption-conflict-"),
		);
		try {
			const contractPath = resolve(
				repositoryRoot,
				"packages/foundation/env/CONTRACT.md",
			);
			await mkdir(resolve(contractPath, ".."), { recursive: true });
			await writeFile(contractPath, "# hand-authored\n", "utf8");

			await expect(
				applyKernelAdoptionTreatments({
					repositoryRoot,
					plan: createPlan(),
				}),
			).rejects.toBeInstanceOf(KernelAdoptionApplyError);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});
});
