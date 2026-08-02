import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
	createGeneratorDiagnostic,
	type GeneratorDiagnostic,
} from "../engine/diagnostic-protocol.ts";
import type { GeneratorDoctorExtension } from "../engine/family-registration.ts";
import type { DiscoveredWorkspace } from "../engine/workspace-discovery.ts";

export const ERP_LAYOUT_AUTHORITY_SCHEMA =
	"afenda.erp-layout-authority/v1" as const;

const PACKAGE_NAME_PREFIX = /^@afenda\//;
const TYPESCRIPT_EXTENSIONS = [".ts", ".tsx"] as const;
const IGNORED_DIRECTORY_NAMES = new Set(["node_modules", "dist", ".turbo"]);
const LOCAL_LAYOUT_SCRIPT_NAMES = new Set(["feature-first-layout.mjs"]);
const PUBLIC_API_CANDIDATES = Object.freeze([
	"src/facade/public-api.ts",
	"src/index.ts",
] as const);
const ROOT_STORE_CANDIDATES = Object.freeze([
	"src/drizzle-store.ts",
	"src/memory-store.ts",
	"src/resolve-store.ts",
	"src/store.ts",
] as const);
const COMPOSITE_STORE_CANDIDATES = Object.freeze([
	"src/composition/adapters/drizzle/store.ts",
	"src/composition/adapters/memory/store.ts",
	"src/composition/store/resolve-store.ts",
] as const);
const RELATIVE_IMPORT_PATTERN =
	/\b(?:from\s+["']|import\s*\(\s*["'])(\.\.?\/[^"']+)["']/g;
const LEADING_PATH_SEPARATOR_PATTERN = /^[/\\]/;

export type ErpLayoutClass =
	| "empty"
	| "feature-first"
	| "historical-root"
	| "hybrid";

export interface ErpLayoutWorkspace {
	readonly compositeStores: readonly string[];
	readonly featureDirectories: readonly string[];
	readonly id: string;
	readonly layoutClass: ErpLayoutClass;
	readonly localLayoutScripts: readonly string[];
	readonly name: string;
	readonly packagePath: string;
	readonly publicApiInventory: readonly string[];
	readonly rootNameMatchesPackage: boolean;
	readonly rootStoreFiles: readonly string[];
	readonly upwardFeatureImports: readonly string[];
}

export interface ErpLayoutSummary {
	readonly empty: number;
	readonly featureFirst: number;
	readonly historicalRoot: number;
	readonly hybrid: number;
	readonly localLayoutScripts: number;
	readonly rootNameMismatches: number;
	readonly total: number;
	readonly upwardFeatureImports: number;
}

export interface ErpLayoutAuthorityReportV1 {
	readonly schema: typeof ERP_LAYOUT_AUTHORITY_SCHEMA;
	readonly summary: ErpLayoutSummary;
	readonly targetLayout: "feature-first-erp";
	readonly workspaces: readonly ErpLayoutWorkspace[];
}

interface CreateErpLayoutAuthorityReportInput {
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

const isErpWorkspace = (workspace: DiscoveredWorkspace): boolean =>
	workspace.classification.kind === "generator-family" &&
	workspace.classification.family === "erp";

const toModuleId = (packageName: string): string =>
	packageName.replace(PACKAGE_NAME_PREFIX, "");

const pathExistsAsFile = async (
	repositoryRoot: string,
	path: string,
): Promise<boolean> => {
	try {
		return (await stat(resolve(repositoryRoot, path))).isFile();
	} catch {
		return false;
	}
};

const pathExistsAsDirectory = async (
	repositoryRoot: string,
	path: string,
): Promise<boolean> => {
	try {
		return (await stat(resolve(repositoryRoot, path))).isDirectory();
	} catch {
		return false;
	}
};

const listExistingFiles = async (
	repositoryRoot: string,
	candidates: readonly string[],
): Promise<readonly string[]> => {
	const results = await Promise.all(
		candidates.map(async (candidate) =>
			(await pathExistsAsFile(repositoryRoot, candidate)) ? candidate : null,
		),
	);
	return Object.freeze(
		results.filter((path) => path !== null).sort(compareText),
	);
};

const listFeatureDirectories = async (
	repositoryRoot: string,
	workspacePath: string,
): Promise<readonly string[]> => {
	const featuresPath = `${workspacePath}/src/features`;
	if (!(await pathExistsAsDirectory(repositoryRoot, featuresPath))) {
		return Object.freeze([]);
	}
	const entries = await readdir(resolve(repositoryRoot, featuresPath), {
		withFileTypes: true,
	});
	return Object.freeze(
		entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => `${featuresPath}/${entry.name}`)
			.sort(compareText),
	);
};

const listLocalLayoutScripts = async (
	repositoryRoot: string,
	workspacePath: string,
): Promise<readonly string[]> => {
	const scriptsPath = `${workspacePath}/scripts`;
	if (!(await pathExistsAsDirectory(repositoryRoot, scriptsPath))) {
		return Object.freeze([]);
	}
	const entries = await readdir(resolve(repositoryRoot, scriptsPath), {
		withFileTypes: true,
	});
	return Object.freeze(
		entries
			.filter(
				(entry) => entry.isFile() && LOCAL_LAYOUT_SCRIPT_NAMES.has(entry.name),
			)
			.map((entry) => `${scriptsPath}/${entry.name}`)
			.sort(compareText),
	);
};

const walkFiles = async (absoluteRoot: string): Promise<readonly string[]> => {
	const entries = await readdir(absoluteRoot, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const path = resolve(absoluteRoot, entry.name);
			if (entry.isDirectory()) {
				return IGNORED_DIRECTORY_NAMES.has(entry.name) ? [] : walkFiles(path);
			}
			return entry.isFile() &&
				TYPESCRIPT_EXTENSIONS.some((extension) =>
					entry.name.endsWith(extension),
				)
				? [path]
				: [];
		}),
	);
	return Object.freeze(nested.flat().sort(compareText));
};

const relativeImportDepth = (specifier: string): number =>
	specifier.split("/").filter((segment) => segment === "..").length;

const listUpwardFeatureImports = async (
	repositoryRoot: string,
	featureDirectories: readonly string[],
): Promise<readonly string[]> => {
	const imports = await Promise.all(
		featureDirectories.map(async (featureDirectory) => {
			const absoluteFeatureDirectory = resolve(
				repositoryRoot,
				featureDirectory,
			);
			const files = await walkFiles(absoluteFeatureDirectory);
			const perFile = await Promise.all(
				files.map(async (absolutePath) => {
					const contents = await readFile(absolutePath, "utf8");
					const matches = [...contents.matchAll(RELATIVE_IMPORT_PATTERN)];
					if (
						!matches.some(
							(match) =>
								typeof match[1] === "string" &&
								relativeImportDepth(match[1]) > 1,
						)
					) {
						return null;
					}
					return absolutePath
						.replace(resolve(repositoryRoot), "")
						.replace(LEADING_PATH_SEPARATOR_PATTERN, "")
						.replaceAll("\\", "/");
				}),
			);
			return perFile.filter((path) => path !== null);
		}),
	);
	return Object.freeze(imports.flat().sort(compareText));
};

const classifyLayout = ({
	featureDirectories,
	rootStoreFiles,
}: Pick<
	ErpLayoutWorkspace,
	"featureDirectories" | "rootStoreFiles"
>): ErpLayoutClass => {
	if (featureDirectories.length > 0 && rootStoreFiles.length > 0) {
		return "hybrid";
	}
	if (featureDirectories.length > 0) {
		return "feature-first";
	}
	if (rootStoreFiles.length > 0) {
		return "historical-root";
	}
	return "empty";
};

const inspectWorkspace = async (
	repositoryRoot: string,
	workspace: DiscoveredWorkspace,
): Promise<ErpLayoutWorkspace> => {
	const id = toModuleId(workspace.name);
	const [
		rootStoreFiles,
		compositeStores,
		publicApiInventory,
		featureDirectories,
		localLayoutScripts,
	] = await Promise.all([
		listExistingFiles(
			repositoryRoot,
			ROOT_STORE_CANDIDATES.map((path) => `${workspace.path}/${path}`),
		),
		listExistingFiles(
			repositoryRoot,
			COMPOSITE_STORE_CANDIDATES.map((path) => `${workspace.path}/${path}`),
		),
		listExistingFiles(
			repositoryRoot,
			PUBLIC_API_CANDIDATES.map((path) => `${workspace.path}/${path}`),
		),
		listFeatureDirectories(repositoryRoot, workspace.path),
		listLocalLayoutScripts(repositoryRoot, workspace.path),
	]);
	const upwardFeatureImports = await listUpwardFeatureImports(
		repositoryRoot,
		featureDirectories,
	);
	return Object.freeze({
		id,
		name: workspace.name,
		packagePath: workspace.path,
		rootNameMatchesPackage: workspace.path.endsWith(`/${id}`),
		layoutClass: classifyLayout({ featureDirectories, rootStoreFiles }),
		featureDirectories,
		rootStoreFiles,
		compositeStores,
		publicApiInventory,
		upwardFeatureImports,
		localLayoutScripts,
	});
};

const createSummary = (
	workspaces: readonly ErpLayoutWorkspace[],
): ErpLayoutSummary => {
	const countLayout = (layoutClass: ErpLayoutClass): number =>
		workspaces.filter((workspace) => workspace.layoutClass === layoutClass)
			.length;
	return Object.freeze({
		total: workspaces.length,
		featureFirst: countLayout("feature-first"),
		historicalRoot: countLayout("historical-root"),
		hybrid: countLayout("hybrid"),
		empty: countLayout("empty"),
		rootNameMismatches: workspaces.filter(
			(workspace) => !workspace.rootNameMatchesPackage,
		).length,
		upwardFeatureImports: workspaces.reduce(
			(total, workspace) => total + workspace.upwardFeatureImports.length,
			0,
		),
		localLayoutScripts: workspaces.reduce(
			(total, workspace) => total + workspace.localLayoutScripts.length,
			0,
		),
	});
};

export const createErpLayoutAuthorityReport = async ({
	repositoryRoot,
	workspaces,
}: CreateErpLayoutAuthorityReportInput): Promise<ErpLayoutAuthorityReportV1> => {
	const inspected = await Promise.all(
		workspaces
			.filter(isErpWorkspace)
			.map((workspace) => inspectWorkspace(repositoryRoot, workspace)),
	);
	const authorityWorkspaces = Object.freeze(
		[...inspected].sort((left, right) =>
			compareText(left.packagePath, right.packagePath),
		),
	);
	return Object.freeze({
		schema: ERP_LAYOUT_AUTHORITY_SCHEMA,
		targetLayout: "feature-first-erp",
		summary: createSummary(authorityWorkspaces),
		workspaces: authorityWorkspaces,
	});
};

const createLayoutDiagnostics = (
	report: ErpLayoutAuthorityReportV1,
): readonly GeneratorDiagnostic[] =>
	Object.freeze(
		report.workspaces
			.flatMap((workspace) => {
				const diagnostics: GeneratorDiagnostic[] = [];
				if (!workspace.rootNameMatchesPackage) {
					diagnostics.push(
						createGeneratorDiagnostic({
							code: "AFG-ERP-101",
							severity: "blocked",
							family: "erp",
							package: workspace.name,
							owner: "erp-generator layout authority",
							treatment: "collision",
							paths: [workspace.packagePath],
							expected: { moduleId: workspace.id },
							actual: { packagePath: workspace.packagePath },
						}),
					);
				}
				if (workspace.layoutClass !== "feature-first") {
					diagnostics.push(
						createGeneratorDiagnostic({
							code: "AFG-ERP-102",
							severity: "warning",
							family: "erp",
							package: workspace.name,
							owner: "erp-generator layout authority",
							treatment: "auto-upgrade",
							paths: [workspace.packagePath],
							expected: { layoutClass: "feature-first" },
							actual: {
								layoutClass: workspace.layoutClass,
								rootStoreFiles: workspace.rootStoreFiles,
								featureDirectories: workspace.featureDirectories,
							},
						}),
					);
				}
				if (workspace.localLayoutScripts.length > 0) {
					diagnostics.push(
						createGeneratorDiagnostic({
							code: "AFG-ERP-103",
							severity: "warning",
							family: "erp",
							package: workspace.name,
							owner: "erp-generator layout authority",
							treatment: "remove-superseded",
							paths: workspace.localLayoutScripts,
							expected: { owner: "erp-generator" },
							actual: { localLayoutScripts: workspace.localLayoutScripts },
						}),
					);
				}
				if (workspace.upwardFeatureImports.length > 0) {
					diagnostics.push(
						createGeneratorDiagnostic({
							code: "AFG-ERP-104",
							severity: "warning",
							family: "erp",
							package: workspace.name,
							owner: "erp-generator layout authority",
							treatment: "auto-upgrade",
							paths: [workspace.packagePath],
							expected: { upwardFeatureImports: 0 },
							actual: {
								upwardFeatureImportCount: workspace.upwardFeatureImports.length,
								sample: workspace.upwardFeatureImports.slice(0, 10),
							},
						}),
					);
				}
				return diagnostics;
			})
			.sort((left, right) =>
				compareText(left.paths[0] ?? "", right.paths[0] ?? ""),
			),
	);

export const createErpLayoutAuthorityDoctorExtension = async (
	input: CreateErpLayoutAuthorityReportInput,
): Promise<GeneratorDoctorExtension> => {
	const report = await createErpLayoutAuthorityReport(input);
	const textLines = [
		`erp-layout-schema=${report.schema}`,
		`erp-layout-count=${report.summary.total}`,
		`erp-layout-feature-first=${report.summary.featureFirst}`,
		`erp-layout-historical-root=${report.summary.historicalRoot}`,
		`erp-layout-hybrid=${report.summary.hybrid}`,
		`erp-layout-empty=${report.summary.empty}`,
		`erp-layout-root-name-mismatches=${report.summary.rootNameMismatches}`,
		`erp-layout-upward-feature-imports=${report.summary.upwardFeatureImports}`,
		`erp-layout-local-scripts=${report.summary.localLayoutScripts}`,
		...report.workspaces.map(
			(workspace) =>
				`erp-layout=${workspace.packagePath}|${workspace.name}|${workspace.layoutClass}|features=${workspace.featureDirectories.length}|root-stores=${workspace.rootStoreFiles.length}|public-api=${workspace.publicApiInventory.length}|upward-imports=${workspace.upwardFeatureImports.length}|local-scripts=${workspace.localLayoutScripts.length}`,
		),
	];
	return Object.freeze({
		kind: "erp-layout-authority",
		json: Object.freeze({
			kind: "erp-layout-authority",
			report,
			textLines: Object.freeze(textLines),
		}),
		diagnostics: createLayoutDiagnostics(report),
		textLines: Object.freeze(textLines),
	});
};
