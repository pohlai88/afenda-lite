import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
	createGeneratorDiagnostic,
	type GeneratorDiagnostic,
} from "../engine/diagnostic-protocol.ts";
import type { GeneratorDoctorExtension } from "../engine/family-registration.ts";
import type { DiscoveredWorkspace } from "../engine/workspace-discovery.ts";
import {
	createErpLayoutAuthorityReport,
	type ErpLayoutAuthorityReportV1,
	type ErpLayoutWorkspace,
} from "./layout-authority.ts";
import {
	createErpManifestAuthorityReport,
	type ErpManifestAuthorityReportV1,
	type ErpManifestAuthorityWorkspace,
} from "./manifest-authority.ts";

export const ERP_PROJECTION_LOCK_AUTHORITY_SCHEMA =
	"afenda.erp-projection-lock-authority/v1" as const;

const LOCK_FILE_NAME = "generator.lock.json";
const DIGEST_ALGORITHM = "sha256";

export type ErpProjectionCompliance = "informational" | "normative";

export interface ErpProjectionLockProjection {
	readonly canonicalInputs: readonly string[];
	readonly compliance: ErpProjectionCompliance;
	readonly digest: string;
	readonly id:
		| "layout-convergence"
		| "module-manifest"
		| "public-api-inventory";
	readonly outputPath: string;
}

export interface ErpProjectionLockWorkspace {
	readonly digest: string;
	readonly id: string;
	readonly lockExists: boolean;
	readonly lockPath: string;
	readonly name: string;
	readonly packagePath: string;
	readonly projections: readonly ErpProjectionLockProjection[];
}

export interface ErpProjectionLockSummary {
	readonly informational: number;
	readonly locksExisting: number;
	readonly locksMissing: number;
	readonly normative: number;
	readonly total: number;
}

export interface ErpProjectionLockAuthorityReportV1 {
	readonly lockFileName: typeof LOCK_FILE_NAME;
	readonly schema: typeof ERP_PROJECTION_LOCK_AUTHORITY_SCHEMA;
	readonly summary: ErpProjectionLockSummary;
	readonly workspaces: readonly ErpProjectionLockWorkspace[];
}

interface CreateErpProjectionLockAuthorityReportInput {
	readonly repositoryRoot: string;
	readonly workspaces: readonly DiscoveredWorkspace[];
}

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const digestText = (value: string): string =>
	createHash(DIGEST_ALGORITHM).update(value).digest("hex");

const normalizeFileContents = (contents: string): string =>
	contents.replaceAll("\r\n", "\n").normalize("NFC");

const readNormalizedInput = async (
	repositoryRoot: string,
	path: string,
): Promise<string> => {
	try {
		return normalizeFileContents(
			await readFile(resolve(repositoryRoot, path), "utf8"),
		);
	} catch {
		return "<missing>\n";
	}
};

const inputDigest = async (
	repositoryRoot: string,
	paths: readonly string[],
): Promise<string> => {
	const normalizedPaths = [...new Set(paths)].sort(compareText);
	const entries = await Promise.all(
		normalizedPaths.map(async (path) =>
			JSON.stringify({
				path,
				digest: digestText(await readNormalizedInput(repositoryRoot, path)),
			}),
		),
	);
	return digestText(`${entries.join("\n")}\n`);
};

const packageDigest = (
	projections: readonly ErpProjectionLockProjection[],
): string =>
	digestText(
		`${JSON.stringify(
			projections.map((projection) => ({
				id: projection.id,
				compliance: projection.compliance,
				outputPath: projection.outputPath,
				digest: projection.digest,
			})),
		)}\n`,
	);

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

const canonicalInputPaths = (
	manifest: ErpManifestAuthorityWorkspace,
): readonly string[] =>
	Object.freeze(
		[
			...(manifest.manifestPath === null ? [] : [manifest.manifestPath]),
			...manifest.semanticInputs.moduleDefinition,
			...manifest.semanticInputs.operationRegistry,
			...manifest.semanticInputs.workspaceEdgeRegister,
		].sort(compareText),
	);

const publicApiInputPaths = (
	manifest: ErpManifestAuthorityWorkspace,
): readonly string[] =>
	Object.freeze(
		[...manifest.semanticInputs.packagePublicApi].sort(compareText),
	);

const layoutInputPaths = (layout: ErpLayoutWorkspace): readonly string[] =>
	Object.freeze(
		[
			...layout.featureDirectories,
			...layout.rootStoreFiles,
			...layout.compositeStores,
			...layout.publicApiInventory,
			...layout.localLayoutScripts,
		].sort(compareText),
	);

const createProjection = async ({
	repositoryRoot,
	id,
	compliance,
	outputPath,
	canonicalInputs,
}: {
	readonly canonicalInputs: readonly string[];
	readonly compliance: ErpProjectionCompliance;
	readonly id: ErpProjectionLockProjection["id"];
	readonly outputPath: string;
	readonly repositoryRoot: string;
}): Promise<ErpProjectionLockProjection> =>
	Object.freeze({
		id,
		compliance,
		outputPath,
		canonicalInputs: Object.freeze([...canonicalInputs].sort(compareText)),
		digest: await inputDigest(repositoryRoot, canonicalInputs),
	});

const indexByPackagePath = <T extends { readonly packagePath: string }>(
	items: readonly T[],
): ReadonlyMap<string, T> =>
	new Map(items.map((item) => [item.packagePath, item]));

const inspectWorkspace = async ({
	repositoryRoot,
	manifest,
	layout,
}: {
	readonly layout: ErpLayoutWorkspace;
	readonly manifest: ErpManifestAuthorityWorkspace;
	readonly repositoryRoot: string;
}): Promise<ErpProjectionLockWorkspace> => {
	const lockPath = `${manifest.packagePath}/src/composition/${LOCK_FILE_NAME}`;
	const projections = Object.freeze([
		await createProjection({
			repositoryRoot,
			id: "module-manifest",
			compliance: "normative",
			outputPath:
				manifest.manifestPath ??
				`${manifest.packagePath}/src/composition/module.manifest.ts`,
			canonicalInputs: canonicalInputPaths(manifest),
		}),
		await createProjection({
			repositoryRoot,
			id: "public-api-inventory",
			compliance: "informational",
			outputPath: `${manifest.packagePath}/src/index.ts`,
			canonicalInputs: publicApiInputPaths(manifest),
		}),
		await createProjection({
			repositoryRoot,
			id: "layout-convergence",
			compliance: "informational",
			outputPath: manifest.packagePath,
			canonicalInputs: layoutInputPaths(layout),
		}),
	]);
	return Object.freeze({
		id: manifest.id,
		name: manifest.name,
		packagePath: manifest.packagePath,
		lockPath,
		lockExists: await fileExists(repositoryRoot, lockPath),
		projections,
		digest: packageDigest(projections),
	});
};

const createSummary = (
	workspaces: readonly ErpProjectionLockWorkspace[],
): ErpProjectionLockSummary => {
	const projections = workspaces.flatMap((workspace) => workspace.projections);
	return Object.freeze({
		total: workspaces.length,
		locksExisting: workspaces.filter((workspace) => workspace.lockExists)
			.length,
		locksMissing: workspaces.filter((workspace) => !workspace.lockExists)
			.length,
		normative: projections.filter(
			(projection) => projection.compliance === "normative",
		).length,
		informational: projections.filter(
			(projection) => projection.compliance === "informational",
		).length,
	});
};

export const createErpProjectionLockAuthorityReport = async ({
	repositoryRoot,
	workspaces,
}: CreateErpProjectionLockAuthorityReportInput): Promise<ErpProjectionLockAuthorityReportV1> => {
	const [manifestReport, layoutReport]: [
		ErpManifestAuthorityReportV1,
		ErpLayoutAuthorityReportV1,
	] = await Promise.all([
		createErpManifestAuthorityReport({ repositoryRoot, workspaces }),
		createErpLayoutAuthorityReport({ repositoryRoot, workspaces }),
	]);
	const layouts = indexByPackagePath(layoutReport.workspaces);
	const inspected = await Promise.all(
		manifestReport.workspaces.map((manifest) => {
			const layout = layouts.get(manifest.packagePath);
			if (layout === undefined) {
				throw new Error(`ERP layout report missing ${manifest.packagePath}`);
			}
			return inspectWorkspace({ repositoryRoot, manifest, layout });
		}),
	);
	const lockWorkspaces = Object.freeze(
		[...inspected].sort((left, right) =>
			compareText(left.packagePath, right.packagePath),
		),
	);
	return Object.freeze({
		schema: ERP_PROJECTION_LOCK_AUTHORITY_SCHEMA,
		lockFileName: LOCK_FILE_NAME,
		summary: createSummary(lockWorkspaces),
		workspaces: lockWorkspaces,
	});
};

const createProjectionLockDiagnostics = (
	report: ErpProjectionLockAuthorityReportV1,
): readonly GeneratorDiagnostic[] =>
	Object.freeze(
		report.workspaces
			.filter((workspace) => !workspace.lockExists)
			.map((workspace) =>
				createGeneratorDiagnostic({
					code: "AFG-ERP-201",
					severity: "warning",
					family: "erp",
					package: workspace.name,
					owner: "erp-generator projection lock authority",
					treatment: "auto-reconcile",
					paths: [workspace.lockPath],
					expected: {
						lockPath: workspace.lockPath,
						digest: workspace.digest,
					},
					actual: {
						lockExists: workspace.lockExists,
					},
				}),
			)
			.sort((left, right) =>
				compareText(left.paths[0] ?? "", right.paths[0] ?? ""),
			),
	);

export const createErpProjectionLockAuthorityDoctorExtension = async (
	input: CreateErpProjectionLockAuthorityReportInput,
): Promise<GeneratorDoctorExtension> => {
	const report = await createErpProjectionLockAuthorityReport(input);
	const textLines = [
		`erp-projection-lock-schema=${report.schema}`,
		`erp-projection-lock-count=${report.summary.total}`,
		`erp-projection-lock-existing=${report.summary.locksExisting}`,
		`erp-projection-lock-missing=${report.summary.locksMissing}`,
		`erp-projection-lock-normative=${report.summary.normative}`,
		`erp-projection-lock-informational=${report.summary.informational}`,
		...report.workspaces.map(
			(workspace) =>
				`erp-projection-lock=${workspace.packagePath}|${workspace.name}|exists=${workspace.lockExists}|digest=${workspace.digest}`,
		),
	];
	return Object.freeze({
		kind: "erp-projection-lock-authority",
		json: Object.freeze({
			kind: "erp-projection-lock-authority",
			report,
			textLines: Object.freeze(textLines),
		}),
		diagnostics: createProjectionLockDiagnostics(report),
		textLines: Object.freeze(textLines),
	});
};
