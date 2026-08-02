import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
	createGeneratorDiagnostic,
	type GeneratorDiagnostic,
} from "../engine/diagnostic-protocol.ts";
import type { GeneratorDoctorExtension } from "../engine/family-registration.ts";
import type { DiscoveredWorkspace } from "../engine/workspace-discovery.ts";

export const ERP_MANIFEST_AUTHORITY_SCHEMA =
	"afenda.erp-manifest-authority/v1" as const;

const CANONICAL_MANIFEST_PATH = "src/composition/module.manifest.ts";
const HISTORICAL_MANIFEST_PATH = "src/module.manifest.ts";
const PACKAGE_NAME_PREFIX = /^@afenda\//;
const WORKSPACE_EDGE_REGISTER_PATH =
	"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml";

const SEMANTIC_INPUT_CANDIDATES = Object.freeze({
	moduleDefinition: Object.freeze(["src/composition/module-definition.ts"]),
	operationRegistry: Object.freeze([
		"src/kernel/operations/registry.ts",
		"src/kernel/operations/governance-manifest.ts",
		"src/operation-registry.ts",
	]),
	packagePublicApi: Object.freeze(["src/facade/public-api.ts", "src/index.ts"]),
	workspaceEdgeRegister: Object.freeze([WORKSPACE_EDGE_REGISTER_PATH]),
});

export type ErpManifestAuthorityState =
	| "canonical"
	| "historical"
	| "missing"
	| "duplicate-identical"
	| "duplicate-conflict";

export interface ErpManifestSemanticInputAvailability {
	readonly moduleDefinition: readonly string[];
	readonly operationRegistry: readonly string[];
	readonly packagePublicApi: readonly string[];
	readonly workspaceEdgeRegister: readonly string[];
}

export interface ErpManifestAuthorityWorkspace {
	readonly expectedExportName: string;
	readonly manifestPath: string | null;
	readonly name: string;
	readonly packagePath: string;
	readonly semanticInputs: ErpManifestSemanticInputAvailability;
	readonly state: ErpManifestAuthorityState;
}

export interface ErpManifestAuthoritySummary {
	readonly canonical: number;
	readonly duplicateConflict: number;
	readonly duplicateIdentical: number;
	readonly historical: number;
	readonly missing: number;
	readonly total: number;
}

export interface ErpManifestAuthorityReportV1 {
	readonly canonicalManifestPath: typeof CANONICAL_MANIFEST_PATH;
	readonly historicalManifestPath: typeof HISTORICAL_MANIFEST_PATH;
	readonly schema: typeof ERP_MANIFEST_AUTHORITY_SCHEMA;
	readonly summary: ErpManifestAuthoritySummary;
	readonly workspaces: readonly ErpManifestAuthorityWorkspace[];
}

interface CreateErpManifestAuthorityReportInput {
	readonly repositoryRoot: string;
	readonly workspaces: readonly DiscoveredWorkspace[];
}

interface ExistingFile {
	readonly contents: string;
	readonly path: string;
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

const isErpWorkspace = (workspace: DiscoveredWorkspace): boolean =>
	workspace.classification.kind === "generator-family" &&
	workspace.classification.family === "erp";

const readExistingFile = async (
	repositoryRoot: string,
	workspacePath: string,
	relativePath: string,
): Promise<ExistingFile | null> => {
	const path = `${workspacePath}/${relativePath}`;
	try {
		const fileStats = await stat(resolve(repositoryRoot, path));
		if (!fileStats.isFile()) {
			return null;
		}
		return Object.freeze({
			path,
			contents: await readFile(resolve(repositoryRoot, path), "utf8"),
		});
	} catch {
		return null;
	}
};

const listExistingPaths = async (
	repositoryRoot: string,
	workspacePath: string,
	candidates: readonly string[],
): Promise<readonly string[]> => {
	const existing = await Promise.all(
		candidates.map(async (candidate) => {
			const path =
				candidate === WORKSPACE_EDGE_REGISTER_PATH
					? candidate
					: `${workspacePath}/${candidate}`;
			try {
				const fileStats = await stat(resolve(repositoryRoot, path));
				return fileStats.isFile() ? path : null;
			} catch {
				return null;
			}
		}),
	);
	return Object.freeze(
		existing.filter((path) => path !== null).sort(compareText),
	);
};

const toManifestExportName = (packageName: string): string => {
	const moduleName = packageName.replace(PACKAGE_NAME_PREFIX, "");
	const [firstSegment = "", ...remainingSegments] = moduleName.split("-");
	const suffix = remainingSegments
		.map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
		.join("");
	return `${firstSegment}${suffix}ModuleManifest`;
};

const classifyManifestState = (
	canonical: ExistingFile | null,
	historical: ExistingFile | null,
): {
	readonly manifestPath: string | null;
	readonly state: ErpManifestAuthorityState;
} => {
	if (canonical !== null && historical !== null) {
		return Object.freeze({
			manifestPath: canonical.path,
			state:
				canonical.contents === historical.contents
					? "duplicate-identical"
					: "duplicate-conflict",
		});
	}
	if (canonical !== null) {
		return Object.freeze({ manifestPath: canonical.path, state: "canonical" });
	}
	if (historical !== null) {
		return Object.freeze({
			manifestPath: historical.path,
			state: "historical",
		});
	}
	return Object.freeze({ manifestPath: null, state: "missing" });
};

const createSemanticInputAvailability = async (
	repositoryRoot: string,
	workspacePath: string,
): Promise<ErpManifestSemanticInputAvailability> => {
	const [
		moduleDefinition,
		operationRegistry,
		packagePublicApi,
		workspaceEdgeRegister,
	] = await Promise.all([
		listExistingPaths(
			repositoryRoot,
			workspacePath,
			SEMANTIC_INPUT_CANDIDATES.moduleDefinition,
		),
		listExistingPaths(
			repositoryRoot,
			workspacePath,
			SEMANTIC_INPUT_CANDIDATES.operationRegistry,
		),
		listExistingPaths(
			repositoryRoot,
			workspacePath,
			SEMANTIC_INPUT_CANDIDATES.packagePublicApi,
		),
		listExistingPaths(
			repositoryRoot,
			workspacePath,
			SEMANTIC_INPUT_CANDIDATES.workspaceEdgeRegister,
		),
	]);
	return Object.freeze({
		moduleDefinition,
		operationRegistry,
		packagePublicApi,
		workspaceEdgeRegister,
	});
};

const inspectWorkspace = async (
	repositoryRoot: string,
	workspace: DiscoveredWorkspace,
): Promise<ErpManifestAuthorityWorkspace> => {
	const [canonical, historical, semanticInputs] = await Promise.all([
		readExistingFile(repositoryRoot, workspace.path, CANONICAL_MANIFEST_PATH),
		readExistingFile(repositoryRoot, workspace.path, HISTORICAL_MANIFEST_PATH),
		createSemanticInputAvailability(repositoryRoot, workspace.path),
	]);
	const manifest = classifyManifestState(canonical, historical);
	return Object.freeze({
		name: workspace.name,
		packagePath: workspace.path,
		expectedExportName: toManifestExportName(workspace.name),
		manifestPath: manifest.manifestPath,
		state: manifest.state,
		semanticInputs,
	});
};

const createSummary = (
	workspaces: readonly ErpManifestAuthorityWorkspace[],
): ErpManifestAuthoritySummary => {
	const countState = (state: ErpManifestAuthorityState): number =>
		workspaces.filter((workspace) => workspace.state === state).length;
	return Object.freeze({
		total: workspaces.length,
		canonical: countState("canonical"),
		historical: countState("historical"),
		missing: countState("missing"),
		duplicateIdentical: countState("duplicate-identical"),
		duplicateConflict: countState("duplicate-conflict"),
	});
};

export const createErpManifestAuthorityReport = async ({
	repositoryRoot,
	workspaces,
}: CreateErpManifestAuthorityReportInput): Promise<ErpManifestAuthorityReportV1> => {
	const erpWorkspaces = workspaces.filter(isErpWorkspace);
	const inspected = await Promise.all(
		erpWorkspaces.map((workspace) =>
			inspectWorkspace(repositoryRoot, workspace),
		),
	);
	const authorityWorkspaces = Object.freeze(
		[...inspected].sort((left, right) =>
			compareText(left.packagePath, right.packagePath),
		),
	);
	return Object.freeze({
		schema: ERP_MANIFEST_AUTHORITY_SCHEMA,
		canonicalManifestPath: CANONICAL_MANIFEST_PATH,
		historicalManifestPath: HISTORICAL_MANIFEST_PATH,
		summary: createSummary(authorityWorkspaces),
		workspaces: authorityWorkspaces,
	});
};

const createManifestDiagnostics = (
	report: ErpManifestAuthorityReportV1,
): readonly GeneratorDiagnostic[] =>
	Object.freeze(
		report.workspaces
			.flatMap((workspace) => {
				if (workspace.state === "missing") {
					return [
						createGeneratorDiagnostic({
							code: "AFG-ERP-001",
							severity: "blocked",
							family: "erp",
							package: workspace.name,
							owner: "erp-generator manifest authority",
							treatment: "semantic-decision-required",
							paths: [workspace.packagePath],
							expected: {
								manifestPath: report.canonicalManifestPath,
							},
							actual: {
								state: workspace.state,
								manifestPath: workspace.manifestPath,
							},
						}),
					];
				}
				if (workspace.state === "duplicate-conflict") {
					return [
						createGeneratorDiagnostic({
							code: "AFG-ERP-002",
							severity: "blocked",
							family: "erp",
							package: workspace.name,
							owner: "erp-generator manifest authority",
							treatment: "collision",
							paths: [
								`${workspace.packagePath}/${CANONICAL_MANIFEST_PATH}`,
								`${workspace.packagePath}/${HISTORICAL_MANIFEST_PATH}`,
							],
							expected: {
								singleManifestAuthority: report.canonicalManifestPath,
							},
							actual: {
								state: workspace.state,
								manifestPath: workspace.manifestPath,
							},
						}),
					];
				}
				return [];
			})
			.sort((left, right) =>
				compareText(left.paths[0] ?? "", right.paths[0] ?? ""),
			),
	);

export const createErpManifestAuthorityDoctorExtension = async (
	input: CreateErpManifestAuthorityReportInput,
): Promise<GeneratorDoctorExtension> => {
	const report = await createErpManifestAuthorityReport(input);
	const textLines = [
		`erp-manifest-schema=${report.schema}`,
		`erp-manifest-count=${report.summary.total}`,
		`erp-manifest-canonical=${report.summary.canonical}`,
		`erp-manifest-historical=${report.summary.historical}`,
		`erp-manifest-missing=${report.summary.missing}`,
		`erp-manifest-duplicate-identical=${report.summary.duplicateIdentical}`,
		`erp-manifest-duplicate-conflict=${report.summary.duplicateConflict}`,
		...report.workspaces.map(
			(workspace) =>
				`erp-manifest=${workspace.packagePath}|${workspace.name}|${workspace.state}|${workspace.manifestPath ?? "-"}`,
		),
	];
	return Object.freeze({
		kind: "erp-manifest-authority",
		json: Object.freeze({
			kind: "erp-manifest-authority",
			report,
			textLines: Object.freeze(textLines),
		}),
		diagnostics: createManifestDiagnostics(report),
		textLines: Object.freeze(textLines),
	});
};
