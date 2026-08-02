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
	createKernelAdoptionAuthorityDoctorExtension,
	createKernelAdoptionAuthorityReport,
} from "../kernel-generator/adoption-authority.ts";

const createWorkspace = (
	path: string,
	name = `@afenda/${path.split("/").at(-1) ?? "unknown"}`,
): DiscoveredWorkspace =>
	Object.freeze({
		classification: Object.freeze({
			kind: "generator-family",
			family: "kernel",
		}),
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

const writeKernelPackage = async ({
	repositoryRoot,
	packagePath,
	packageName,
	withContract = true,
	withRootEntrypoint = true,
	withRootExport = true,
}: {
	readonly packageName: string;
	readonly packagePath: string;
	readonly repositoryRoot: string;
	readonly withContract?: boolean;
	readonly withRootEntrypoint?: boolean;
	readonly withRootExport?: boolean;
}): Promise<void> => {
	await writeFixtureFile(
		repositoryRoot,
		`${packagePath}/package.json`,
		`${JSON.stringify(
			{
				name: packageName,
				private: true,
				type: "module",
				exports: withRootExport
					? { ".": { types: "./src/index.ts", default: "./src/index.ts" } }
					: { "./node": { types: "./src/node.ts", default: "./src/node.ts" } },
			},
			null,
			"\t",
		)}\n`,
	);
	await writeFixtureFile(
		repositoryRoot,
		`${packagePath}/README.md`,
		"# Test\n",
	);
	if (withContract) {
		await writeFixtureFile(
			repositoryRoot,
			`${packagePath}/CONTRACT.md`,
			"# Contract\n",
		);
	}
	if (withRootEntrypoint) {
		await writeFixtureFile(
			repositoryRoot,
			`${packagePath}/src/index.ts`,
			"export const kernel = true;\n",
		);
	}
};

describe("kernel package adoption authority", () => {
	it("adopts registered kernel packages and reports deterministic maturity gaps", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-kernel-adoption-"),
		);
		try {
			await writeKernelPackage({
				repositoryRoot,
				packagePath: "packages/foundation/config",
				packageName: "@afenda/config",
				withContract: false,
				withRootEntrypoint: false,
				withRootExport: false,
			});
			await writeKernelPackage({
				repositoryRoot,
				packagePath: "packages/runtime/logger",
				packageName: "@afenda/logger",
			});
			await writeKernelPackage({
				repositoryRoot,
				packagePath: "packages/runtime/extra",
				packageName: "@afenda/extra",
			});

			const first = await createKernelAdoptionAuthorityReport({
				repositoryRoot,
				workspaces: [
					createWorkspace("packages/foundation/config", "@afenda/config"),
					createWorkspace("packages/runtime/extra", "@afenda/extra"),
					createWorkspace("packages/runtime/logger", "@afenda/logger"),
				],
			});
			const second = await createKernelAdoptionAuthorityReport({
				repositoryRoot,
				workspaces: [
					createWorkspace("packages/runtime/logger", "@afenda/logger"),
					createWorkspace("packages/foundation/config", "@afenda/config"),
					createWorkspace("packages/runtime/extra", "@afenda/extra"),
				],
			});

			expect(second).toEqual(first);
			expect(first.summary).toEqual({
				registered: 18,
				discovered: 3,
				adopted: 2,
				missing: 16,
				unregistered: 1,
				contractMissing: 17,
				rootEntrypointMissing: 17,
				rootExportMissing: 17,
			});
			expect(first.workspaces).toContainEqual(
				expect.objectContaining({
					name: "@afenda/config",
					packagePath: "packages/foundation/config",
					state: "adopted",
					contractExists: false,
					rootEntrypointExists: false,
					rootExportExists: false,
				}),
			);
			expect(first.workspaces).toContainEqual(
				expect.objectContaining({
					name: "@afenda/logger",
					packagePath: "packages/runtime/logger",
					state: "adopted",
					contractExists: true,
					rootEntrypointExists: true,
					rootExportExists: true,
				}),
			);
			expect(first.workspaces).toContainEqual(
				expect.objectContaining({
					name: "@afenda/extra",
					packagePath: "packages/runtime/extra",
					state: "unregistered",
				}),
			);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("keeps kernel adoption discovery read-only", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-kernel-adoption-read-only-"),
		);
		try {
			await writeKernelPackage({
				repositoryRoot,
				packagePath: "packages/runtime/logger",
				packageName: "@afenda/logger",
			});
			const before = await captureRepositoryState(repositoryRoot);
			await createKernelAdoptionAuthorityReport({
				repositoryRoot,
				workspaces: [createWorkspace("packages/runtime/logger")],
			});
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

	it("emits fixed diagnostics for missing, unregistered, and partial kernels", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-kernel-adoption-diagnostics-"),
		);
		try {
			await writeKernelPackage({
				repositoryRoot,
				packagePath: "packages/foundation/config",
				packageName: "@afenda/config",
				withContract: false,
				withRootEntrypoint: false,
				withRootExport: false,
			});
			await writeKernelPackage({
				repositoryRoot,
				packagePath: "packages/runtime/extra",
				packageName: "@afenda/extra",
			});

			const extension = await createKernelAdoptionAuthorityDoctorExtension({
				repositoryRoot,
				workspaces: [
					createWorkspace("packages/foundation/config", "@afenda/config"),
					createWorkspace("packages/runtime/extra", "@afenda/extra"),
				],
			});

			expect(extension.kind).toBe("kernel-adoption-authority");
			expect(extension.textLines).toContain("kernel-adoption-registered=18");
			expect(extension.textLines).toContain("kernel-adoption-discovered=2");
			expect(extension.diagnostics).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						code: "AFG-KERNEL-001",
						severity: "blocked",
						treatment: "semantic-decision-required",
						package: "@afenda/admin",
					}),
					expect.objectContaining({
						code: "AFG-KERNEL-002",
						severity: "warning",
						treatment: "unsupported",
						package: "@afenda/extra",
					}),
					expect.objectContaining({
						code: "AFG-KERNEL-003",
						severity: "warning",
						treatment: "auto-upgrade",
						package: "@afenda/config",
					}),
					expect.objectContaining({
						code: "AFG-KERNEL-004",
						severity: "warning",
						treatment: "auto-regenerate",
						package: "@afenda/config",
					}),
					expect.objectContaining({
						code: "AFG-KERNEL-005",
						severity: "warning",
						treatment: "auto-upgrade",
						package: "@afenda/config",
					}),
				]),
			);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("diagnoses the live kernel adoption surface", async () => {
		const report = await createKernelAdoptionAuthorityReport({
			repositoryRoot: process.cwd(),
			workspaces: [
				createWorkspace("packages/control-plane/admin", "@afenda/admin"),
				createWorkspace("packages/control-plane/auth", "@afenda/auth"),
				createWorkspace("packages/data-plane/audit", "@afenda/audit"),
				createWorkspace("packages/data-plane/db", "@afenda/db"),
				createWorkspace("packages/data-plane/events", "@afenda/events"),
				createWorkspace(
					"packages/data-plane/notifications",
					"@afenda/notifications",
				),
				createWorkspace("packages/data-plane/search", "@afenda/search"),
				createWorkspace("packages/foundation/config", "@afenda/config"),
				createWorkspace("packages/foundation/env", "@afenda/env"),
				createWorkspace("packages/foundation/errors", "@afenda/errors"),
				createWorkspace("packages/foundation/testing", "@afenda/testing"),
				createWorkspace("packages/runtime/cache", "@afenda/cache"),
				createWorkspace("packages/runtime/http", "@afenda/http"),
				createWorkspace("packages/runtime/logger", "@afenda/logger"),
				createWorkspace("packages/runtime/metrics", "@afenda/metrics"),
				createWorkspace("packages/runtime/openapi", "@afenda/openapi"),
				createWorkspace("packages/runtime/rate-limit", "@afenda/rate-limit"),
				createWorkspace("packages/runtime/security", "@afenda/security"),
			],
		});

		expect(report.summary).toEqual({
			registered: 18,
			discovered: 18,
			adopted: 18,
			missing: 0,
			unregistered: 0,
			contractMissing: 2,
			rootEntrypointMissing: 1,
			rootExportMissing: 2,
		});
		expect(
			report.workspaces
				.filter((workspace) => !workspace.contractExists)
				.map((workspace) => workspace.name),
		).toEqual(["@afenda/env", "@afenda/testing"]);
		expect(
			report.workspaces
				.filter((workspace) => !workspace.rootEntrypointExists)
				.map((workspace) => workspace.name),
		).toEqual(["@afenda/config"]);
		expect(
			report.workspaces
				.filter((workspace) => !workspace.rootExportExists)
				.map((workspace) => workspace.name),
		).toEqual(["@afenda/config", "@afenda/metrics"]);
	});
});
