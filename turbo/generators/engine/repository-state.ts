import { createHash } from "node:crypto";
import { lstat, readdir, readFile, readlink, realpath } from "node:fs/promises";
import { resolve } from "node:path";

export const GENERATOR_REPOSITORY_STATE_SCHEMA =
	"afenda.generator-repository-state/v1" as const;

export const GENERATOR_STATE_RECURSIVE_ROOTS = Object.freeze([
	"turbo/generators",
	"packages",
	"apps",
	"docs-V2",
	"scripts",
] as const);

export const GENERATOR_STATE_ROOT_FILES = Object.freeze([
	".biomeignore",
	".editorconfig",
	".gitattributes",
	".gitignore",
	".npmrc",
	"biome.jsonc",
	"package.json",
	"pnpm-lock.yaml",
	"pnpm-workspace.yaml",
	"turbo.json",
] as const);

export const GENERATOR_STATE_EXCLUDED_SEGMENTS = Object.freeze([
	".git",
	"node_modules",
	".turbo",
	".next",
	"coverage",
	"dist",
	"tmp",
] as const);

export type RepositoryStateEntry =
	| {
			readonly kind: "directory";
			readonly path: string;
	  }
	| {
			readonly digest: string;
			readonly kind: "file";
			readonly path: string;
	  }
	| {
			readonly kind: "symlink";
			readonly path: string;
			readonly symlinkTarget: string;
	  };

export interface RepositoryStateSnapshot {
	readonly digest: string;
	readonly entries: readonly RepositoryStateEntry[];
	readonly schema: typeof GENERATOR_REPOSITORY_STATE_SCHEMA;
}

export interface RepositoryStateDelta {
	readonly added: readonly string[];
	readonly changed: readonly string[];
	readonly count: number;
	readonly removed: readonly string[];
}

const ROOT_TSCONFIG = /^tsconfig.*\.json$/;
const STATE_DIGEST_ALGORITHM = "sha256";
const excludedSegments = new Set<string>(GENERATOR_STATE_EXCLUDED_SEGMENTS);

const compareText = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};

const normalizePath = (value: string): string =>
	value.replaceAll("\\", "/").normalize("NFC");

const isMissingPathError = (error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	Reflect.get(error, "code") === "ENOENT";

const isExcludedPath = (path: string): boolean =>
	path.split("/").some((segment) => excludedSegments.has(segment));

const digestBytes = (value: Uint8Array): string =>
	createHash(STATE_DIGEST_ALGORITHM).update(value).digest("hex");

const freezeEntry = (entry: RepositoryStateEntry): RepositoryStateEntry =>
	Object.freeze(entry);

const capturePath = async (
	repositoryRoot: string,
	repositoryPath: string,
	entries: RepositoryStateEntry[],
	seenPaths: Set<string>,
): Promise<void> => {
	const normalizedPath = normalizePath(repositoryPath);
	if (seenPaths.has(normalizedPath) || isExcludedPath(normalizedPath)) {
		return;
	}
	const absolutePath = resolve(repositoryRoot, ...normalizedPath.split("/"));
	let stats: Awaited<ReturnType<typeof lstat>>;
	try {
		stats = await lstat(absolutePath);
	} catch (error: unknown) {
		if (isMissingPathError(error)) {
			return;
		}
		throw error;
	}
	seenPaths.add(normalizedPath);
	if (stats.isSymbolicLink()) {
		entries.push(
			freezeEntry({
				kind: "symlink",
				path: normalizedPath,
				symlinkTarget: normalizePath(await readlink(absolutePath)),
			}),
		);
		return;
	}
	if (stats.isFile()) {
		entries.push(
			freezeEntry({
				digest: digestBytes(await readFile(absolutePath)),
				kind: "file",
				path: normalizedPath,
			}),
		);
		return;
	}
	if (!stats.isDirectory()) {
		throw new Error(
			`repository state path '${normalizedPath}' has an unsupported kind`,
		);
	}
	entries.push(freezeEntry({ kind: "directory", path: normalizedPath }));
	const children = await readdir(absolutePath, { withFileTypes: true });
	children.sort((left, right) => compareText(left.name, right.name));
	await Promise.all(
		children.map((child) =>
			capturePath(
				repositoryRoot,
				`${normalizedPath}/${child.name}`,
				entries,
				seenPaths,
			),
		),
	);
};

const discoverRootTsconfigs = async (
	repositoryRoot: string,
): Promise<readonly string[]> => {
	const children = await readdir(repositoryRoot, { withFileTypes: true });
	return Object.freeze(
		children
			.filter(
				(child) =>
					(child.isFile() || child.isSymbolicLink()) &&
					ROOT_TSCONFIG.test(child.name),
			)
			.map((child) => child.name.normalize("NFC"))
			.sort(compareText),
	);
};

const serializeEntries = (entries: readonly RepositoryStateEntry[]): string =>
	JSON.stringify(entries);

export const captureRepositoryState = async (
	inputRoot: string,
): Promise<RepositoryStateSnapshot> => {
	const repositoryRoot = await realpath(resolve(inputRoot));
	const entries: RepositoryStateEntry[] = [];
	const seenPaths = new Set<string>();
	const roots = [
		...GENERATOR_STATE_RECURSIVE_ROOTS,
		...GENERATOR_STATE_ROOT_FILES,
		...(await discoverRootTsconfigs(repositoryRoot)),
	].sort(compareText);
	await Promise.all(
		roots.map((root) => capturePath(repositoryRoot, root, entries, seenPaths)),
	);
	entries.sort((left, right) => compareText(left.path, right.path));
	const frozenEntries = Object.freeze(entries);
	return Object.freeze({
		schema: GENERATOR_REPOSITORY_STATE_SCHEMA,
		digest: digestBytes(
			new TextEncoder().encode(serializeEntries(frozenEntries)),
		),
		entries: frozenEntries,
	});
};

const entrySignature = (entry: RepositoryStateEntry): string =>
	JSON.stringify(entry);

export const compareRepositoryStates = (
	before: RepositoryStateSnapshot,
	after: RepositoryStateSnapshot,
): RepositoryStateDelta => {
	const beforeEntries = new Map(
		before.entries.map((entry) => [entry.path, entrySignature(entry)]),
	);
	const afterEntries = new Map(
		after.entries.map((entry) => [entry.path, entrySignature(entry)]),
	);
	const added: string[] = [];
	const changed: string[] = [];
	const removed: string[] = [];
	for (const [path, signature] of beforeEntries) {
		const afterSignature = afterEntries.get(path);
		if (afterSignature === undefined) {
			removed.push(path);
		} else if (afterSignature !== signature) {
			changed.push(path);
		}
	}
	for (const path of afterEntries.keys()) {
		if (!beforeEntries.has(path)) {
			added.push(path);
		}
	}
	added.sort(compareText);
	changed.sort(compareText);
	removed.sort(compareText);
	return Object.freeze({
		added: Object.freeze(added),
		changed: Object.freeze(changed),
		removed: Object.freeze(removed),
		count: added.length + changed.length + removed.length,
	});
};
