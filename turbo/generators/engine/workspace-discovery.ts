import { lstat, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import fastGlob from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { GeneratorContractRegistry, GeneratorFamily } from "./types.ts";

const REPOSITORY_MARKERS = [
	"package.json",
	"pnpm-workspace.yaml",
	"turbo.json",
] as const;

const DISCOVERY_IGNORES = [
	"**/node_modules/**",
	"**/.next/**",
	"**/.turbo/**",
	"**/.cache/**",
	"**/build/**",
	"**/dist/**",
	"**/coverage/**",
] as const;

const AFENDA_PACKAGE_NAME = /^@afenda\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WINDOWS_DRIVE_PATH = /^[A-Za-z]:/;
const ASCII_CONTROL_MAX = 31;
const ASCII_DELETE = 127;

export type WorkspaceFamilyClassification =
	| {
			readonly kind: "generator-family";
			readonly family: GeneratorFamily;
	  }
	| {
			readonly kind: "outside-generator-families";
	  };

export type WorkspaceModuleType = "module" | "commonjs" | "unspecified";

export interface DiscoveredWorkspace {
	readonly classification: WorkspaceFamilyClassification;
	readonly moduleType: WorkspaceModuleType;
	readonly name: string;
	readonly path: string;
	readonly private: true;
}

export interface WorkspaceDiscoveryResult {
	readonly workspacePatterns: readonly string[];
	readonly workspaces: readonly DiscoveredWorkspace[];
}

export type WorkspaceDiscoveryIssueKind =
	| "invalid-repository-root"
	| "invalid-workspace-config"
	| "invalid-workspace-pattern"
	| "non-workspace-directory"
	| "invalid-package-json"
	| "duplicate-package-name"
	| "case-collision"
	| "workspace-escape"
	| "nested-workspace"
	| "ambiguous-family";

export interface WorkspaceDiscoveryIssue {
	readonly kind: WorkspaceDiscoveryIssueKind;
	readonly message: string;
	readonly path: string;
}

export interface DiscoverWorkspacesOptions {
	readonly contracts: GeneratorContractRegistry;
	readonly repositoryRoot: string;
}

interface ParsedWorkspaceIdentity {
	readonly moduleType: WorkspaceModuleType;
	readonly name: string;
	readonly private: true;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const containsControlCharacter = (value: string): boolean => {
	for (const character of value) {
		const characterCode = character.charCodeAt(0);
		if (characterCode <= ASCII_CONTROL_MAX || characterCode === ASCII_DELETE) {
			return true;
		}
	}
	return false;
};

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const sortIssues = (
	issues: readonly WorkspaceDiscoveryIssue[],
): readonly WorkspaceDiscoveryIssue[] =>
	Object.freeze(
		[...issues].sort(
			(left, right) =>
				compareText(left.path, right.path) ||
				compareText(left.kind, right.kind) ||
				compareText(left.message, right.message),
		),
	);

export class WorkspaceDiscoveryError extends Error {
	readonly issues: readonly WorkspaceDiscoveryIssue[];

	constructor(
		issues: readonly WorkspaceDiscoveryIssue[],
		options?: ErrorOptions,
	) {
		const sortedIssues = sortIssues(issues);
		super(
			`workspace discovery failed:\n${sortedIssues
				.map((issue) => `${issue.kind} ${issue.path}: ${issue.message}`)
				.join("\n")}`,
			options,
		);
		this.name = "WorkspaceDiscoveryError";
		this.issues = sortedIssues;
	}
}

export const normalizeWorkspacePath = (value: string): string => {
	const posixPath = value.replaceAll("\\", "/").normalize("NFC");
	return posixPath.startsWith("./") ? posixPath.slice(2) : posixPath;
};

const isPathInsideRoot = (root: string, target: string): boolean => {
	const relativePath = relative(root, target);
	return (
		relativePath === "" ||
		!(relativePath.startsWith("..") || isAbsolute(relativePath))
	);
};

const parseJson = (contents: string): unknown => {
	try {
		return JSON.parse(contents);
	} catch {
		return null;
	}
};

const verifyRepositoryRoot = async (inputRoot: string): Promise<string> => {
	const issues: WorkspaceDiscoveryIssue[] = [];
	const resolvedRoot = resolve(inputRoot);
	let canonicalRoot: string;
	try {
		const rootStats = await stat(resolvedRoot);
		if (!rootStats.isDirectory()) {
			throw new WorkspaceDiscoveryError([
				{
					kind: "invalid-repository-root",
					path: ".",
					message: "repository root must be a directory",
				},
			]);
		}
		canonicalRoot = await realpath(resolvedRoot);
	} catch (error: unknown) {
		if (error instanceof WorkspaceDiscoveryError) {
			throw error;
		}
		throw new WorkspaceDiscoveryError(
			[
				{
					kind: "invalid-repository-root",
					path: ".",
					message: "repository root is not readable",
				},
			],
			{ cause: error },
		);
	}

	const markerIssues = await Promise.all(
		REPOSITORY_MARKERS.map(async (marker) => {
			const markerPath = resolve(canonicalRoot, marker);
			try {
				const markerStats = await stat(markerPath);
				const canonicalMarker = await realpath(markerPath);
				if (!markerStats.isFile()) {
					return {
						kind: "invalid-repository-root",
						path: marker,
						message: "repository marker must be a file",
					} satisfies WorkspaceDiscoveryIssue;
				}
				if (!isPathInsideRoot(canonicalRoot, canonicalMarker)) {
					return {
						kind: "workspace-escape",
						path: marker,
						message: "repository marker resolves outside the repository root",
					} satisfies WorkspaceDiscoveryIssue;
				}
			} catch {
				return {
					kind: "invalid-repository-root",
					path: marker,
					message: "required repository marker is missing or unreadable",
				} satisfies WorkspaceDiscoveryIssue;
			}
		}),
	);
	issues.push(...markerIssues.filter((issue) => issue !== undefined));
	if (issues.length > 0) {
		throw new WorkspaceDiscoveryError(issues);
	}
	let rootPackage: unknown;
	try {
		rootPackage = parseJson(
			await readFile(resolve(canonicalRoot, "package.json"), "utf8"),
		);
	} catch (error: unknown) {
		throw new WorkspaceDiscoveryError(
			[
				{
					kind: "invalid-repository-root",
					path: "package.json",
					message: "repository package identity is unreadable",
				},
			],
			{ cause: error },
		);
	}
	if (!isRecord(rootPackage) || rootPackage.private !== true) {
		throw new WorkspaceDiscoveryError([
			{
				kind: "invalid-repository-root",
				path: "package.json#private",
				message: "repository root must declare private: true",
			},
		]);
	}
	return canonicalRoot;
};

const validateWorkspacePattern = (
	pattern: string,
	path: string,
	issues: WorkspaceDiscoveryIssue[],
): string | undefined => {
	const body = pattern.startsWith("!") ? pattern.slice(1) : pattern;
	const segments = body.split("/");
	if (
		body.length === 0 ||
		body.includes("\\") ||
		body.startsWith("/") ||
		WINDOWS_DRIVE_PATH.test(body) ||
		containsControlCharacter(body) ||
		segments.some(
			(segment) => segment === "" || segment === "." || segment === "..",
		)
	) {
		issues.push({
			kind: "invalid-workspace-pattern",
			path,
			message: "workspace patterns must be repository-relative POSIX globs",
		});
		return;
	}
	return pattern;
};

const readWorkspacePatterns = async (
	repositoryRoot: string,
): Promise<readonly string[]> => {
	const issues: WorkspaceDiscoveryIssue[] = [];
	let parsed: unknown;
	try {
		const contents = await readFile(
			resolve(repositoryRoot, "pnpm-workspace.yaml"),
			"utf8",
		);
		parsed = parseYaml(contents);
	} catch (error: unknown) {
		throw new WorkspaceDiscoveryError(
			[
				{
					kind: "invalid-workspace-config",
					path: "pnpm-workspace.yaml",
					message: "workspace configuration must contain valid YAML",
				},
			],
			{ cause: error },
		);
	}
	if (!(isRecord(parsed) && Array.isArray(parsed.packages))) {
		throw new WorkspaceDiscoveryError([
			{
				kind: "invalid-workspace-config",
				path: "pnpm-workspace.yaml#packages",
				message: "workspace configuration requires a packages array",
			},
		]);
	}

	const patterns: string[] = [];
	for (const [index, value] of parsed.packages.entries()) {
		const path = `pnpm-workspace.yaml#packages[${index}]`;
		if (typeof value !== "string" || value.length === 0) {
			issues.push({
				kind: "invalid-workspace-pattern",
				path,
				message: "workspace pattern must be a non-empty string",
			});
			continue;
		}
		const pattern = validateWorkspacePattern(value, path, issues);
		if (pattern !== undefined) {
			patterns.push(pattern);
		}
	}
	if (patterns.filter((pattern) => !pattern.startsWith("!")).length === 0) {
		issues.push({
			kind: "invalid-workspace-config",
			path: "pnpm-workspace.yaml#packages",
			message: "workspace configuration requires a positive package pattern",
		});
	}
	if (issues.length > 0) {
		throw new WorkspaceDiscoveryError(issues);
	}
	return Object.freeze([...patterns]);
};

export const findWorkspacePathCaseCollisions = (
	paths: readonly string[],
): readonly WorkspaceDiscoveryIssue[] => {
	const firstByFoldedPath = new Map<string, string>();
	const issues: WorkspaceDiscoveryIssue[] = [];
	for (const workspacePath of [...paths].sort(compareText)) {
		const normalizedPath = normalizeWorkspacePath(workspacePath);
		const foldedPath = normalizedPath.toLowerCase();
		const firstPath = firstByFoldedPath.get(foldedPath);
		if (firstPath === undefined) {
			firstByFoldedPath.set(foldedPath, normalizedPath);
		} else if (firstPath !== normalizedPath) {
			issues.push({
				kind: "case-collision",
				path: normalizedPath,
				message: `workspace path collides with '${firstPath}' when case-folded`,
			});
		}
	}
	return sortIssues(issues);
};

const readWorkspaceIdentity = async (
	repositoryRoot: string,
	workspacePath: string,
	issues: WorkspaceDiscoveryIssue[],
): Promise<ParsedWorkspaceIdentity | undefined> => {
	const packageJsonPath = `${workspacePath}/package.json`;
	const absolutePackageJsonPath = resolve(repositoryRoot, packageJsonPath);
	let parsed: unknown;
	try {
		const packageJsonStats = await stat(absolutePackageJsonPath);
		const canonicalPackageJsonPath = await realpath(absolutePackageJsonPath);
		if (!packageJsonStats.isFile()) {
			issues.push({
				kind: "non-workspace-directory",
				path: workspacePath,
				message: "workspace directory does not contain a package.json file",
			});
			return;
		}
		if (!isPathInsideRoot(repositoryRoot, canonicalPackageJsonPath)) {
			issues.push({
				kind: "workspace-escape",
				path: packageJsonPath,
				message: "package identity resolves outside the repository root",
			});
			return;
		}
		const contents = await readFile(absolutePackageJsonPath, "utf8");
		parsed = parseJson(contents);
	} catch {
		issues.push({
			kind: "non-workspace-directory",
			path: workspacePath,
			message: "workspace directory does not contain a readable package.json",
		});
		return;
	}
	if (!isRecord(parsed)) {
		issues.push({
			kind: "invalid-package-json",
			path: packageJsonPath,
			message: "package.json must contain valid JSON object data",
		});
		return;
	}
	if (
		typeof parsed.name !== "string" ||
		!AFENDA_PACKAGE_NAME.test(parsed.name)
	) {
		issues.push({
			kind: "invalid-package-json",
			path: `${packageJsonPath}#name`,
			message:
				"workspace name must use canonical @afenda/<kebab-case> identity",
		});
		return;
	}
	if (parsed.private !== true) {
		issues.push({
			kind: "invalid-package-json",
			path: `${packageJsonPath}#private`,
			message: "workspace package must declare private: true",
		});
		return;
	}
	if (
		parsed.type !== undefined &&
		parsed.type !== "module" &&
		parsed.type !== "commonjs"
	) {
		issues.push({
			kind: "invalid-package-json",
			path: `${packageJsonPath}#type`,
			message: "package type must be module, commonjs, or omitted",
		});
		return;
	}
	const moduleType = parsed.type ?? "unspecified";
	return Object.freeze({ name: parsed.name, private: true, moduleType });
};

const classifyWorkspace = (
	workspacePath: string,
	contracts: GeneratorContractRegistry,
	issues: WorkspaceDiscoveryIssue[],
): WorkspaceFamilyClassification => {
	const matchingFamilies = new Set<GeneratorFamily>();
	for (const family of ["kernel", "erp"] satisfies readonly GeneratorFamily[]) {
		for (const root of contracts[family].pathPolicy.workspaceRoots) {
			if (workspacePath.startsWith(`${root}/`)) {
				matchingFamilies.add(family);
			}
		}
	}
	if (matchingFamilies.size > 1) {
		issues.push({
			kind: "ambiguous-family",
			path: workspacePath,
			message: "workspace matches more than one generator family root",
		});
		return Object.freeze({ kind: "outside-generator-families" });
	}
	const family = matchingFamilies.values().next().value;
	return family === undefined
		? Object.freeze({ kind: "outside-generator-families" })
		: Object.freeze({ kind: "generator-family", family });
};

const validateNestedWorkspaces = async (
	repositoryRoot: string,
	workspacePath: string,
	issues: WorkspaceDiscoveryIssue[],
): Promise<void> => {
	let nestedPackageFiles: string[];
	try {
		nestedPackageFiles = await fastGlob("**/package.json", {
			cwd: resolve(repositoryRoot, workspacePath),
			followSymbolicLinks: false,
			onlyFiles: true,
			unique: true,
			ignore: [...DISCOVERY_IGNORES],
		});
	} catch {
		issues.push({
			kind: "non-workspace-directory",
			path: workspacePath,
			message: "workspace contents are unreadable",
		});
		return;
	}
	for (const nestedPackageFile of nestedPackageFiles
		.map(normalizeWorkspacePath)
		.filter((path) => path !== "package.json")
		.sort(compareText)) {
		issues.push({
			kind: "nested-workspace",
			path: `${workspacePath}/${nestedPackageFile}`,
			message: "workspace contains an unexpected nested package.json",
		});
	}
};

const inspectWorkspaceCandidate = async (
	repositoryRoot: string,
	workspacePath: string,
	contracts: GeneratorContractRegistry,
	issues: WorkspaceDiscoveryIssue[],
): Promise<DiscoveredWorkspace | undefined> => {
	const absolutePath = resolve(repositoryRoot, workspacePath);
	try {
		const lexicalStats = await lstat(absolutePath);
		const canonicalPath = await realpath(absolutePath);
		if (!isPathInsideRoot(repositoryRoot, canonicalPath)) {
			issues.push({
				kind: "workspace-escape",
				path: workspacePath,
				message: "workspace candidate resolves outside the repository root",
			});
			return;
		}
		const canonicalStats = await stat(canonicalPath);
		if (!(lexicalStats.isDirectory() || lexicalStats.isSymbolicLink())) {
			issues.push({
				kind: "non-workspace-directory",
				path: workspacePath,
				message: "workspace pattern matched a non-directory entry",
			});
			return;
		}
		if (!canonicalStats.isDirectory()) {
			issues.push({
				kind: "non-workspace-directory",
				path: workspacePath,
				message: "workspace candidate must resolve to a directory",
			});
			return;
		}
	} catch {
		issues.push({
			kind: "non-workspace-directory",
			path: workspacePath,
			message: "workspace candidate is missing or unreadable",
		});
		return;
	}

	const identity = await readWorkspaceIdentity(
		repositoryRoot,
		workspacePath,
		issues,
	);
	if (identity === undefined) {
		return;
	}
	await validateNestedWorkspaces(repositoryRoot, workspacePath, issues);
	return Object.freeze({
		classification: classifyWorkspace(workspacePath, contracts, issues),
		moduleType: identity.moduleType,
		name: identity.name,
		path: workspacePath,
		private: identity.private,
	});
};

const validateDuplicatePackageNames = (
	workspaces: readonly DiscoveredWorkspace[],
	issues: WorkspaceDiscoveryIssue[],
): void => {
	const firstPathByName = new Map<string, string>();
	for (const workspace of workspaces) {
		const firstPath = firstPathByName.get(workspace.name);
		if (firstPath === undefined) {
			firstPathByName.set(workspace.name, workspace.path);
		} else {
			issues.push({
				kind: "duplicate-package-name",
				path: `${workspace.path}/package.json#name`,
				message: `package identity duplicates '${firstPath}'`,
			});
		}
	}
};

const selectWorkspaceDirectoryCandidates = async (
	repositoryRoot: string,
	paths: readonly string[],
): Promise<readonly string[]> => {
	const candidates = await Promise.all(
		paths.map(async (workspacePath) => {
			try {
				const entryStats = await lstat(resolve(repositoryRoot, workspacePath));
				return entryStats.isDirectory() || entryStats.isSymbolicLink()
					? workspacePath
					: null;
			} catch {
				return workspacePath;
			}
		}),
	);
	return Object.freeze(
		candidates.filter((workspacePath) => workspacePath !== null),
	);
};

export const discoverWorkspaces = async ({
	contracts,
	repositoryRoot,
}: DiscoverWorkspacesOptions): Promise<WorkspaceDiscoveryResult> => {
	const canonicalRoot = await verifyRepositoryRoot(repositoryRoot);
	const workspacePatterns = await readWorkspacePatterns(canonicalRoot);
	let rawMatches: string[];
	try {
		rawMatches = await fastGlob([...workspacePatterns], {
			cwd: canonicalRoot,
			dot: false,
			followSymbolicLinks: false,
			onlyFiles: false,
			unique: true,
			ignore: [...DISCOVERY_IGNORES],
		});
	} catch (error: unknown) {
		throw new WorkspaceDiscoveryError(
			[
				{
					kind: "invalid-workspace-pattern",
					path: "pnpm-workspace.yaml#packages",
					message: "workspace patterns must contain valid glob syntax",
				},
			],
			{ cause: error },
		);
	}
	const matchedPaths = [
		...new Set(rawMatches.map(normalizeWorkspacePath)),
	].sort(compareText);
	const workspacePaths = await selectWorkspaceDirectoryCandidates(
		canonicalRoot,
		matchedPaths,
	);
	const issues: WorkspaceDiscoveryIssue[] = [
		...findWorkspacePathCaseCollisions(workspacePaths),
	];
	const inspectedWorkspaces = await Promise.all(
		workspacePaths.map((workspacePath) =>
			inspectWorkspaceCandidate(
				canonicalRoot,
				workspacePath,
				contracts,
				issues,
			),
		),
	);
	const workspaces = inspectedWorkspaces.filter(
		(workspace) => workspace !== undefined,
	);
	validateDuplicatePackageNames(workspaces, issues);
	if (issues.length > 0) {
		throw new WorkspaceDiscoveryError(issues);
	}
	return Object.freeze({
		workspacePatterns: Object.freeze([...workspacePatterns].sort(compareText)),
		workspaces: Object.freeze(
			[...workspaces].sort((left, right) => compareText(left.path, right.path)),
		),
	});
};
