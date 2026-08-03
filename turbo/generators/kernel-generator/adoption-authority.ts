import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
	createGeneratorDiagnostic,
	type GeneratorDiagnostic,
} from "../engine/diagnostic-protocol.ts";
import type { GeneratorDoctorExtension } from "../engine/family-registration.ts";
import type { DiscoveredWorkspace } from "../engine/workspace-discovery.ts";

export const KERNEL_ADOPTION_AUTHORITY_SCHEMA =
	"afenda.kernel-adoption-authority/v1" as const;

export type KernelProfile =
	| "control-plane"
	| "data-plane"
	| "foundation-leaf"
	| "runtime-configured"
	| "runtime-leaf";

/**
 * `root-capability` packages expose a JavaScript surface at `src/index.ts` and a
 * `"."` export. `tooling-only` packages are consumed by build tools through
 * `extends` and have neither — asserting the root-entrypoint shape against one
 * would manufacture a violation of that package's own contract.
 */
export type KernelSurface = "root-capability" | "tooling-only";

export interface RegisteredKernelPackage {
	readonly contractReference: string;
	readonly name: string;
	readonly path: string;
	readonly profile: KernelProfile;
	readonly surface?: KernelSurface;
}

export interface KernelAdoptionWorkspace {
	readonly contractExists: boolean;
	readonly expected: RegisteredKernelPackage | null;
	readonly name: string;
	readonly packagePath: string;
	readonly profile: KernelProfile | "unregistered";
	readonly readmeExists: boolean;
	readonly rootEntrypointExists: boolean;
	readonly rootExportExists: boolean;
	readonly state: "adopted" | "missing" | "unregistered";
	readonly surface: KernelSurface;
}

export interface KernelAdoptionSummary {
	readonly adopted: number;
	readonly contractMissing: number;
	readonly discovered: number;
	readonly missing: number;
	readonly registered: number;
	readonly rootEntrypointMissing: number;
	readonly rootExportMissing: number;
	readonly unregistered: number;
}

export interface KernelAdoptionAuthorityReportV1 {
	readonly expectedRootEntrypoint: "src/index.ts";
	readonly schema: typeof KERNEL_ADOPTION_AUTHORITY_SCHEMA;
	readonly summary: KernelAdoptionSummary;
	readonly workspaces: readonly KernelAdoptionWorkspace[];
}

interface CreateKernelAdoptionAuthorityReportInput {
	readonly repositoryRoot: string;
	readonly workspaces: readonly DiscoveredWorkspace[];
}

const REGISTERED_KERNEL_PACKAGES = Object.freeze([
	{
		name: "@afenda/config",
		path: "packages/foundation/config",
		profile: "foundation-leaf",
		// Ships Biome and TypeScript JSON profiles only. Its CONTRACT.md INV-1
		// forbids both a `"."` export and a src/ tree, so AFG-KERNEL-003/005 must
		// not fire here.
		surface: "tooling-only",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/config-kernel.md",
	},
	{
		name: "@afenda/errors",
		path: "packages/foundation/errors",
		profile: "foundation-leaf",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/errors-kernel.md",
	},
	{
		name: "@afenda/env",
		path: "packages/foundation/env",
		profile: "foundation-leaf",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/env-kernel.md",
	},
	{
		name: "@afenda/testing",
		path: "packages/foundation/testing",
		profile: "foundation-leaf",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/testing-kernel.md",
	},
	{
		name: "@afenda/db",
		path: "packages/data-plane/db",
		profile: "data-plane",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/db-kernel.md",
	},
	{
		name: "@afenda/audit",
		path: "packages/data-plane/audit",
		profile: "data-plane",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/audit-kernel.md",
	},
	{
		name: "@afenda/events",
		path: "packages/data-plane/events",
		profile: "data-plane",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/events-kernel.md",
	},
	{
		name: "@afenda/search",
		path: "packages/data-plane/search",
		profile: "data-plane",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/search-kernel.md",
	},
	{
		name: "@afenda/notifications",
		path: "packages/data-plane/notifications",
		profile: "data-plane",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/notifications-kernel.md",
	},
	{
		name: "@afenda/logger",
		path: "packages/runtime/logger",
		profile: "runtime-leaf",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/logger-kernel.md",
	},
	{
		name: "@afenda/http",
		path: "packages/runtime/http",
		profile: "runtime-leaf",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/http-kernel.md",
	},
	{
		name: "@afenda/security",
		path: "packages/runtime/security",
		profile: "runtime-leaf",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/security-kernel.md",
	},
	{
		name: "@afenda/metrics",
		path: "packages/runtime/metrics",
		profile: "runtime-leaf",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/metrics-kernel.md",
	},
	{
		name: "@afenda/openapi",
		path: "packages/runtime/openapi",
		profile: "runtime-configured",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/openapi-kernel.md",
	},
	{
		name: "@afenda/rate-limit",
		path: "packages/runtime/rate-limit",
		profile: "runtime-configured",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/rate-limit-kernel.md",
	},
	{
		name: "@afenda/cache",
		path: "packages/runtime/cache",
		profile: "runtime-configured",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/cache-kernel.md",
	},
	{
		name: "@afenda/auth",
		path: "packages/control-plane/auth",
		profile: "control-plane",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/auth-kernel.md",
	},
	{
		name: "@afenda/admin",
		path: "packages/control-plane/admin",
		profile: "control-plane",
		contractReference:
			".cursor/skills/afenda-elite-kernel/references/admin-kernel.md",
	},
] as const satisfies readonly RegisteredKernelPackage[]);

const EXPECTED_ROOT_ENTRYPOINT = "src/index.ts" as const;
const DEFAULT_KERNEL_SURFACE: KernelSurface = "root-capability";

/** Only root-capability packages owe a root entrypoint and a `"."` export. */
const owesRootSurface = (workspace: KernelAdoptionWorkspace): boolean =>
	workspace.surface === "root-capability";

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const isKernelWorkspace = (workspace: DiscoveredWorkspace): boolean =>
	workspace.classification.kind === "generator-family" &&
	workspace.classification.family === "kernel";

const fileExists = async (
	repositoryRoot: string,
	path: string,
): Promise<boolean> => {
	try {
		return (await stat(resolve(repositoryRoot, path))).isFile();
	} catch {
		return false;
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readPackageJson = async (
	repositoryRoot: string,
	packagePath: string,
): Promise<Record<string, unknown>> => {
	const parsed: unknown = JSON.parse(
		await readFile(
			resolve(repositoryRoot, packagePath, "package.json"),
			"utf8",
		),
	);
	if (!isRecord(parsed)) {
		throw new Error(`${packagePath}/package.json must contain an object`);
	}
	return parsed;
};

const rootExportExists = (packageJson: Record<string, unknown>): boolean => {
	const exportsValue = packageJson.exports;
	return (
		typeof exportsValue === "object" &&
		exportsValue !== null &&
		!Array.isArray(exportsValue) &&
		Object.hasOwn(exportsValue, ".")
	);
};

const indexRegisteredByPath = (): ReadonlyMap<
	string,
	RegisteredKernelPackage
> =>
	new Map(
		REGISTERED_KERNEL_PACKAGES.map((definition) => [
			definition.path,
			definition,
		]),
	);

const indexWorkspacesByPath = (
	workspaces: readonly DiscoveredWorkspace[],
): ReadonlyMap<string, DiscoveredWorkspace> =>
	new Map(
		workspaces
			.filter(isKernelWorkspace)
			.map((workspace) => [workspace.path, workspace]),
	);

const inspectAdoptedWorkspace = async ({
	repositoryRoot,
	workspace,
	expected,
}: {
	readonly expected: RegisteredKernelPackage;
	readonly repositoryRoot: string;
	readonly workspace: DiscoveredWorkspace;
}): Promise<KernelAdoptionWorkspace> => {
	const packageJson = await readPackageJson(repositoryRoot, workspace.path);
	return Object.freeze({
		state: "adopted",
		name: workspace.name,
		packagePath: workspace.path,
		profile: expected.profile,
		surface: expected.surface ?? DEFAULT_KERNEL_SURFACE,
		expected,
		readmeExists: await fileExists(
			repositoryRoot,
			`${workspace.path}/README.md`,
		),
		contractExists: await fileExists(
			repositoryRoot,
			`${workspace.path}/CONTRACT.md`,
		),
		rootEntrypointExists: await fileExists(
			repositoryRoot,
			`${workspace.path}/${EXPECTED_ROOT_ENTRYPOINT}`,
		),
		rootExportExists: rootExportExists(packageJson),
	});
};

const inspectMissingWorkspace = (
	expected: RegisteredKernelPackage,
): KernelAdoptionWorkspace =>
	Object.freeze({
		state: "missing",
		name: expected.name,
		packagePath: expected.path,
		profile: expected.profile,
		surface: expected.surface ?? DEFAULT_KERNEL_SURFACE,
		expected,
		readmeExists: false,
		contractExists: false,
		rootEntrypointExists: false,
		rootExportExists: false,
	});

const inspectUnregisteredWorkspace = async ({
	repositoryRoot,
	workspace,
}: {
	readonly repositoryRoot: string;
	readonly workspace: DiscoveredWorkspace;
}): Promise<KernelAdoptionWorkspace> => {
	const packageJson = await readPackageJson(repositoryRoot, workspace.path);
	return Object.freeze({
		state: "unregistered",
		name: workspace.name,
		packagePath: workspace.path,
		profile: "unregistered",
		surface: DEFAULT_KERNEL_SURFACE,
		expected: null,
		readmeExists: await fileExists(
			repositoryRoot,
			`${workspace.path}/README.md`,
		),
		contractExists: await fileExists(
			repositoryRoot,
			`${workspace.path}/CONTRACT.md`,
		),
		rootEntrypointExists: await fileExists(
			repositoryRoot,
			`${workspace.path}/${EXPECTED_ROOT_ENTRYPOINT}`,
		),
		rootExportExists: rootExportExists(packageJson),
	});
};

const createSummary = (
	workspaces: readonly KernelAdoptionWorkspace[],
	discovered: number,
): KernelAdoptionSummary =>
	Object.freeze({
		registered: REGISTERED_KERNEL_PACKAGES.length,
		discovered,
		adopted: workspaces.filter((workspace) => workspace.state === "adopted")
			.length,
		missing: workspaces.filter((workspace) => workspace.state === "missing")
			.length,
		unregistered: workspaces.filter(
			(workspace) => workspace.state === "unregistered",
		).length,
		contractMissing: workspaces.filter((workspace) => !workspace.contractExists)
			.length,
		rootEntrypointMissing: workspaces.filter(
			(workspace) => owesRootSurface(workspace) && !workspace.rootEntrypointExists,
		).length,
		rootExportMissing: workspaces.filter(
			(workspace) => owesRootSurface(workspace) && !workspace.rootExportExists,
		).length,
	});

export const createKernelAdoptionAuthorityReport = async ({
	repositoryRoot,
	workspaces,
}: CreateKernelAdoptionAuthorityReportInput): Promise<KernelAdoptionAuthorityReportV1> => {
	const registeredByPath = indexRegisteredByPath();
	const kernelWorkspaces = workspaces.filter(isKernelWorkspace);
	const workspacesByPath = indexWorkspacesByPath(kernelWorkspaces);
	const adoptedOrMissing = await Promise.all(
		REGISTERED_KERNEL_PACKAGES.map((expected) => {
			const workspace = workspacesByPath.get(expected.path);
			return workspace === undefined
				? inspectMissingWorkspace(expected)
				: inspectAdoptedWorkspace({ repositoryRoot, workspace, expected });
		}),
	);
	const unregistered = await Promise.all(
		kernelWorkspaces
			.filter((workspace) => !registeredByPath.has(workspace.path))
			.map((workspace) =>
				inspectUnregisteredWorkspace({ repositoryRoot, workspace }),
			),
	);
	const adoptionWorkspaces = Object.freeze(
		[...adoptedOrMissing, ...unregistered].sort((left, right) =>
			compareText(left.packagePath, right.packagePath),
		),
	);
	return Object.freeze({
		schema: KERNEL_ADOPTION_AUTHORITY_SCHEMA,
		expectedRootEntrypoint: EXPECTED_ROOT_ENTRYPOINT,
		summary: createSummary(adoptionWorkspaces, kernelWorkspaces.length),
		workspaces: adoptionWorkspaces,
	});
};

const createAdoptionDiagnostics = (
	report: KernelAdoptionAuthorityReportV1,
): readonly GeneratorDiagnostic[] =>
	Object.freeze(
		report.workspaces
			.flatMap((workspace) => {
				const diagnostics: GeneratorDiagnostic[] = [];
				if (workspace.state === "missing") {
					diagnostics.push(
						createGeneratorDiagnostic({
							code: "AFG-KERNEL-001",
							severity: "blocked",
							family: "kernel",
							package: workspace.name,
							owner: "kernel-generator adoption authority",
							treatment: "semantic-decision-required",
							paths: [workspace.packagePath],
							expected: { registeredKernel: workspace.expected },
							actual: { state: workspace.state },
						}),
					);
					return diagnostics;
				}
				if (workspace.state === "unregistered") {
					diagnostics.push(
						createGeneratorDiagnostic({
							code: "AFG-KERNEL-002",
							severity: "warning",
							family: "kernel",
							package: workspace.name,
							owner: "kernel-generator adoption authority",
							treatment: "unsupported",
							paths: [workspace.packagePath],
							expected: { registered: true },
							actual: { state: workspace.state },
						}),
					);
				}
				if (owesRootSurface(workspace) && !workspace.rootEntrypointExists) {
					diagnostics.push(
						createGeneratorDiagnostic({
							code: "AFG-KERNEL-003",
							severity: "warning",
							family: "kernel",
							package: workspace.name,
							owner: "kernel-generator adoption authority",
							treatment: "auto-upgrade",
							paths: [`${workspace.packagePath}/${EXPECTED_ROOT_ENTRYPOINT}`],
							expected: { rootEntrypoint: EXPECTED_ROOT_ENTRYPOINT },
							actual: { rootEntrypointExists: workspace.rootEntrypointExists },
						}),
					);
				}
				if (!workspace.contractExists) {
					diagnostics.push(
						createGeneratorDiagnostic({
							code: "AFG-KERNEL-004",
							severity: "warning",
							family: "kernel",
							package: workspace.name,
							owner: "kernel-generator adoption authority",
							treatment: "auto-regenerate",
							paths: [`${workspace.packagePath}/CONTRACT.md`],
							expected: { contractPath: "CONTRACT.md" },
							actual: { contractExists: workspace.contractExists },
						}),
					);
				}
				if (owesRootSurface(workspace) && !workspace.rootExportExists) {
					diagnostics.push(
						createGeneratorDiagnostic({
							code: "AFG-KERNEL-005",
							severity: "warning",
							family: "kernel",
							package: workspace.name,
							owner: "kernel-generator adoption authority",
							treatment: "auto-upgrade",
							paths: [`${workspace.packagePath}/package.json`],
							expected: { exports: ["."] },
							actual: { rootExportExists: workspace.rootExportExists },
						}),
					);
				}
				return diagnostics;
			})
			.sort((left, right) =>
				compareText(left.paths[0] ?? "", right.paths[0] ?? ""),
			),
	);

export const createKernelAdoptionAuthorityDoctorExtension = async (
	input: CreateKernelAdoptionAuthorityReportInput,
): Promise<GeneratorDoctorExtension> => {
	const report = await createKernelAdoptionAuthorityReport(input);
	const textLines = [
		`kernel-adoption-schema=${report.schema}`,
		`kernel-adoption-registered=${report.summary.registered}`,
		`kernel-adoption-discovered=${report.summary.discovered}`,
		`kernel-adoption-adopted=${report.summary.adopted}`,
		`kernel-adoption-missing=${report.summary.missing}`,
		`kernel-adoption-unregistered=${report.summary.unregistered}`,
		`kernel-adoption-contract-missing=${report.summary.contractMissing}`,
		`kernel-adoption-root-entrypoint-missing=${report.summary.rootEntrypointMissing}`,
		`kernel-adoption-root-export-missing=${report.summary.rootExportMissing}`,
		...report.workspaces.map(
			(workspace) =>
				`kernel-adoption=${workspace.packagePath}|${workspace.name}|${workspace.profile}|${workspace.surface}|${workspace.state}|contract=${workspace.contractExists}|entrypoint=${workspace.rootEntrypointExists}|root-export=${workspace.rootExportExists}`,
		),
	];
	return Object.freeze({
		kind: "kernel-adoption-authority",
		json: Object.freeze({
			kind: "kernel-adoption-authority",
			report,
			textLines: Object.freeze(textLines),
		}),
		diagnostics: createAdoptionDiagnostics(report),
		textLines: Object.freeze(textLines),
	});
};
