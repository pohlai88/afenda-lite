import {
	mkdir,
	readdir,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

import { generatorContracts } from "../contracts.ts";
import {
	createGeneratorDiagnostic,
	type GeneratorDiagnostic,
} from "../engine/diagnostic-protocol.ts";
import type { GeneratorDoctorExtension } from "../engine/family-registration.ts";
import {
	type DiscoveredWorkspace,
	discoverWorkspaces,
} from "../engine/workspace-discovery.ts";

export const ERP_MANIFEST_AUTHORITY_SCHEMA =
	"afenda.erp-manifest-authority/v1" as const;

const CANONICAL_MANIFEST_PATH = "src/composition/module.manifest.ts";
const HISTORICAL_MANIFEST_PATH = "src/module.manifest.ts";
const PACKAGE_NAME_PREFIX = /^@afenda\//;
const WORKSPACE_EDGE_REGISTER_PATH =
	"docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml";
const RELATIVE_DOT_IMPORT_PATTERN = /(from\s+["'])\.\//g;
const HISTORICAL_MANIFEST_REFERENCE_PATTERN = /src\/module\.manifest/g;
const ROOT_LOCAL_MANIFEST_IMPORT_PATTERN = /(["'])\.\/module\.manifest(["'])/g;
const ROOT_SOURCE_MANIFEST_IMPORT_PATTERN =
	/(["'])\.\.\/src\/module\.manifest(["'])/g;
const LEADING_PATH_SEPARATOR_PATTERN = /^[/\\]/;

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
	readonly id: string;
	readonly manifestPath: string | null;
	readonly name: string;
	readonly packageAuthorizationPath: string | null;
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

interface FileUpdate {
	readonly contents: string;
	readonly path: string;
}

export interface ErpManifestPackageAuthority {
	readonly authorizationPath: string | null;
	readonly dir: string;
	readonly id: string;
	readonly manifestExport: string;
	readonly manifestPath: string;
	readonly packageName: string;
	readonly state: ErpManifestAuthorityState;
}

export interface ErpManifestProjectionResult {
	readonly changed: readonly string[];
	readonly report: ErpManifestAuthorityReportV1;
	readonly unchanged: readonly string[];
}

interface ProjectErpManifestAuthorityInput {
	readonly repositoryRoot: string;
	readonly write: boolean;
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

const toModuleId = (packageName: string): string =>
	packageName.replace(PACKAGE_NAME_PREFIX, "");

const resolveManifestPath = (
	workspace: DiscoveredWorkspace,
	state: ErpManifestAuthorityState,
): string | null => {
	if (
		state === "canonical" ||
		state === "duplicate-identical" ||
		state === "duplicate-conflict"
	) {
		return `${workspace.path}/${CANONICAL_MANIFEST_PATH}`;
	}
	if (state === "historical") {
		return `${workspace.path}/${HISTORICAL_MANIFEST_PATH}`;
	}
	return null;
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

const findPackageAuthorizationPath = async (
	repositoryRoot: string,
	workspacePath: string,
): Promise<string | null> => {
	const candidates = [
		"src/authorization.ts",
		"src/kernel/authorization/contextual-authorization.ts",
		"src/kernel/authorization/authorization.ts",
		"src/kernel/execution/authorization.ts",
	];
	const existing = await listExistingPaths(
		repositoryRoot,
		workspacePath,
		candidates,
	);
	return existing[0] ?? null;
};

const inspectWorkspace = async (
	repositoryRoot: string,
	workspace: DiscoveredWorkspace,
): Promise<ErpManifestAuthorityWorkspace> => {
	const [canonical, historical, semanticInputs, packageAuthorizationPath] =
		await Promise.all([
			readExistingFile(repositoryRoot, workspace.path, CANONICAL_MANIFEST_PATH),
			readExistingFile(
				repositoryRoot,
				workspace.path,
				HISTORICAL_MANIFEST_PATH,
			),
			createSemanticInputAvailability(repositoryRoot, workspace.path),
			findPackageAuthorizationPath(repositoryRoot, workspace.path),
		]);
	const manifest = classifyManifestState(canonical, historical);
	return Object.freeze({
		id: toModuleId(workspace.name),
		name: workspace.name,
		packagePath: workspace.path,
		expectedExportName: toManifestExportName(workspace.name),
		manifestPath: resolveManifestPath(workspace, manifest.state),
		state: manifest.state,
		packageAuthorizationPath,
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

export const discoverErpManifestAuthorityReport = async (
	repositoryRoot: string,
): Promise<ErpManifestAuthorityReportV1> => {
	const discovery = await discoverWorkspaces({
		repositoryRoot,
		contracts: generatorContracts,
	});
	return createErpManifestAuthorityReport({
		repositoryRoot,
		workspaces: discovery.workspaces,
	});
};

export const listErpManifestPackageAuthority = async (
	repositoryRoot: string,
): Promise<readonly ErpManifestPackageAuthority[]> => {
	const report = await discoverErpManifestAuthorityReport(repositoryRoot);
	if (report.summary.missing > 0 || report.summary.duplicateConflict > 0) {
		const blocked = report.workspaces
			.filter(
				(workspace) =>
					workspace.state === "missing" ||
					workspace.state === "duplicate-conflict",
			)
			.map((workspace) => `${workspace.packagePath}:${workspace.state}`)
			.join(", ");
		throw new Error(`ERP manifest authority is blocked: ${blocked}`);
	}
	return Object.freeze(
		report.workspaces
			.filter((workspace) => workspace.manifestPath !== null)
			.map((workspace) =>
				Object.freeze({
					id: workspace.id,
					packageName: workspace.name,
					dir: workspace.packagePath,
					manifestPath:
						workspace.state === "canonical" ||
						workspace.state === "duplicate-identical" ||
						workspace.state === "duplicate-conflict"
							? CANONICAL_MANIFEST_PATH
							: HISTORICAL_MANIFEST_PATH,
					manifestExport: workspace.expectedExportName,
					authorizationPath:
						workspace.packageAuthorizationPath === null
							? null
							: workspace.packageAuthorizationPath.replace(
									`${workspace.packagePath}/`,
									"",
								),
					state: workspace.state,
				}),
			),
	);
};

const renderCanonicalProjectionFromHistorical = (contents: string): string =>
	contents.replaceAll(RELATIVE_DOT_IMPORT_PATTERN, "$1../");

const readPackageJson = async (repositoryRoot: string, packagePath: string) => {
	const path = resolve(repositoryRoot, packagePath, "package.json");
	const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error(`${packagePath}/package.json must be a JSON object`);
	}
	return parsed;
};

const projectHistoricalWorkspace = async (
	repositoryRoot: string,
	workspace: ErpManifestAuthorityWorkspace,
	write: boolean,
): Promise<readonly string[]> => {
	if (workspace.state !== "historical") {
		return Object.freeze([]);
	}
	const historicalPath = `${workspace.packagePath}/${HISTORICAL_MANIFEST_PATH}`;
	const canonicalPath = `${workspace.packagePath}/${CANONICAL_MANIFEST_PATH}`;
	const historicalContents = await readFile(
		resolve(repositoryRoot, historicalPath),
		"utf8",
	);
	const canonicalContents =
		renderCanonicalProjectionFromHistorical(historicalContents);
	const packageJson = await readPackageJson(
		repositoryRoot,
		workspace.packagePath,
	);
	const serializedPackageJson = `${JSON.stringify(
		updatePackageManifestExport(packageJson),
		null,
		"\t",
	)}\n`;
	const referenceUpdates = await listManifestReferenceUpdates(
		repositoryRoot,
		workspace.packagePath,
	);
	const changed = [
		canonicalPath,
		historicalPath,
		`${workspace.packagePath}/package.json`,
		...referenceUpdates.map((update) => update.path),
	].sort(compareText);
	if (write) {
		await mkdir(
			resolve(repositoryRoot, workspace.packagePath, "src", "composition"),
			{
				recursive: true,
			},
		);
		await writeFile(
			resolve(repositoryRoot, canonicalPath),
			canonicalContents,
			"utf8",
		);
		await writeFile(
			resolve(repositoryRoot, workspace.packagePath, "package.json"),
			serializedPackageJson,
			"utf8",
		);
		await Promise.all(
			referenceUpdates.map((update) =>
				writeFile(
					resolve(repositoryRoot, update.path),
					update.contents,
					"utf8",
				),
			),
		);
		await rm(resolve(repositoryRoot, historicalPath), { force: true });
	}
	return Object.freeze(changed);
};

const listManifestReferenceUpdates = async (
	repositoryRoot: string,
	packagePath: string,
): Promise<readonly FileUpdate[]> => {
	const absolutePackagePath = resolve(repositoryRoot, packagePath);
	const files = await walkPackageFiles(absolutePackagePath);
	const updates = await Promise.all(
		files.map(async (absolutePath) => {
			const contents = await readFile(absolutePath, "utf8");
			const packageRelativePath = absolutePath
				.replace(absolutePackagePath, "")
				.replace(LEADING_PATH_SEPARATOR_PATTERN, "")
				.replaceAll("\\", "/");
			const rootImportRepaired = isPackageRootSourceFile(packageRelativePath)
				? contents.replaceAll(
						ROOT_LOCAL_MANIFEST_IMPORT_PATTERN,
						"$1./composition/module.manifest$2",
					)
				: contents;
			const nextContents = rootImportRepaired
				.replaceAll(
					ROOT_SOURCE_MANIFEST_IMPORT_PATTERN,
					"$1../src/composition/module.manifest$2",
				)
				.replaceAll(
					HISTORICAL_MANIFEST_REFERENCE_PATTERN,
					"src/composition/module.manifest",
				);
			if (nextContents === contents) {
				return null;
			}
			return Object.freeze({
				path: absolutePath
					.replace(resolve(repositoryRoot), "")
					.replace(LEADING_PATH_SEPARATOR_PATTERN, "")
					.replaceAll("\\", "/"),
				contents: nextContents,
			});
		}),
	);
	return Object.freeze(
		updates
			.filter((update) => update !== null)
			.sort((left, right) => compareText(left.path, right.path)),
	);
};

const isPackageRootSourceFile = (packageRelativePath: string): boolean =>
	packageRelativePath.startsWith("src/") &&
	!packageRelativePath.slice("src/".length).includes("/");

const walkPackageFiles = async (root: string): Promise<readonly string[]> => {
	const entries = await readdir(root, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const path = resolve(root, entry.name);
			if (entry.isDirectory()) {
				if (
					entry.name === "node_modules" ||
					entry.name === "dist" ||
					entry.name === ".turbo"
				) {
					return [];
				}
				return walkPackageFiles(path);
			}
			if (entry.isFile() && entry.name.endsWith(".ts")) {
				return [path];
			}
			return [];
		}),
	);
	return Object.freeze(nested.flat().sort(compareText));
};

const updatePackageManifestExport = (packageJson: object): object => {
	const exportsValue = Reflect.get(packageJson, "exports");
	if (
		typeof exportsValue !== "object" ||
		exportsValue === null ||
		Array.isArray(exportsValue)
	) {
		return packageJson;
	}
	const manifestExport = Reflect.get(exportsValue, "./module-manifest");
	if (
		typeof manifestExport !== "object" ||
		manifestExport === null ||
		Array.isArray(manifestExport)
	) {
		return packageJson;
	}
	Reflect.set(manifestExport, "types", `./${CANONICAL_MANIFEST_PATH}`);
	Reflect.set(manifestExport, "default", `./${CANONICAL_MANIFEST_PATH}`);
	return packageJson;
};

export const projectErpManifestAuthority = async ({
	repositoryRoot,
	write,
}: ProjectErpManifestAuthorityInput): Promise<ErpManifestProjectionResult> => {
	const report = await discoverErpManifestAuthorityReport(repositoryRoot);
	if (report.summary.missing > 0 || report.summary.duplicateConflict > 0) {
		throw new Error(
			"ERP manifest authority projection is blocked by missing or duplicate-conflict manifests",
		);
	}
	const changes = await Promise.all(
		report.workspaces.map((workspace) =>
			projectHistoricalWorkspace(repositoryRoot, workspace, write),
		),
	);
	const changed = Object.freeze(changes.flat().sort(compareText));
	return Object.freeze({
		report,
		changed,
		unchanged: Object.freeze(
			report.workspaces
				.filter((workspace) => workspace.state === "canonical")
				.map((workspace) => workspace.packagePath)
				.sort(compareText),
		),
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
