/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

/**
 * GUIDE-018 I5.5: fail-closed DATABASE_URL resolution for DB-backed tests.
 *
 * Resolution precedence:
 * 1. process.env.DATABASE_URL
 * 2. repo-root `.env.local` outside CI only
 */

import { existsSync, type PathLike, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_MARKER = "pnpm-workspace.yaml";
const LOCAL_ENV_FILE = ".env.local";
const ENV_FILE_LINE_PATTERN = /\r?\n/;
const DATABASE_URL_ASSIGNMENT_PATTERN = /^DATABASE_URL\s*=\s*(.*)$/;

type Environment = NodeJS.ProcessEnv;

type FileSystemPort = Readonly<{
	exists: (target: PathLike) => boolean;
	readText: (target: PathLike) => string;
}>;

const nodeFileSystem: FileSystemPort = {
	exists: existsSync,
	readText: (target) => readFileSync(target, "utf8"),
};

export type DatabaseUrlSource = "environment" | "env-local" | "missing";

export type DatabaseForTests = Readonly<{
	databaseUrl: string | undefined;
	hasDatabase: boolean;
	source: DatabaseUrlSource;
}>;

export type ResolveDatabaseUrlOptions = Readonly<{
	environment?: Environment;
	repositoryRoot?: string;
	fileSystem?: FileSystemPort;
	startDirectory?: string;
}>;

function normalizeNonEmptyValue(value: string | undefined): string | undefined {
	const normalized = value?.trim();

	return normalized && normalized.length > 0 ? normalized : undefined;
}

function parseEnabledFlag(value: string | undefined): boolean {
	const normalized = normalizeNonEmptyValue(value)?.toLowerCase();

	return normalized === "1" || normalized === "true";
}

function isCiEnvironment(environment: Environment): boolean {
	return parseEnabledFlag(environment.CI);
}

function isDatabaseRequired(environment: Environment): boolean {
	return (
		isCiEnvironment(environment) ||
		parseEnabledFlag(environment.REQUIRE_DATABASE_TESTS)
	);
}

function findRepositoryRootFrom(
	currentDirectory: string,
	startDirectory: string,
	fileSystem: FileSystemPort,
): string {
	const markerPath = path.join(currentDirectory, REPOSITORY_MARKER);
	if (fileSystem.exists(markerPath)) {
		return currentDirectory;
	}

	const parentDirectory = path.dirname(currentDirectory);
	if (parentDirectory === currentDirectory) {
		throw new Error(
			[
				"@afenda/testing could not locate the workspace root.",
				`Expected to find ${REPOSITORY_MARKER} while walking upward`,
				`from ${startDirectory}.`,
			].join(" "),
		);
	}

	return findRepositoryRootFrom(parentDirectory, startDirectory, fileSystem);
}

function findRepositoryRoot(
	startDirectory: string,
	fileSystem: FileSystemPort,
): string {
	const resolvedStartDirectory = path.resolve(startDirectory);
	return findRepositoryRootFrom(
		resolvedStartDirectory,
		resolvedStartDirectory,
		fileSystem,
	);
}

function unwrapQuotedValue(value: string): string {
	if (value.length < 2) {
		return value;
	}

	const [firstCharacter] = value;
	const lastCharacter = value.at(-1);
	const isDoubleQuoted = firstCharacter === '"' && lastCharacter === '"';
	const isSingleQuoted = firstCharacter === "'" && lastCharacter === "'";

	return isDoubleQuoted || isSingleQuoted ? value.slice(1, -1) : value;
}

function parseDatabaseUrlFromEnvFile(text: string): string | undefined {
	for (const line of text.split(ENV_FILE_LINE_PATTERN)) {
		const trimmedLine = line.trim();

		if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) {
			continue;
		}

		const match = DATABASE_URL_ASSIGNMENT_PATTERN.exec(trimmedLine);

		if (!match) {
			continue;
		}

		const rawValue = match[1]?.trim() ?? "";
		const unwrappedValue = unwrapQuotedValue(rawValue);

		return normalizeNonEmptyValue(unwrappedValue);
	}
}

function loadDatabaseUrlFromEnvLocal(
	repositoryRoot: string,
	fileSystem: FileSystemPort,
): string | undefined {
	const envFilePath = path.join(repositoryRoot, LOCAL_ENV_FILE);

	if (!fileSystem.exists(envFilePath)) {
		return;
	}

	return parseDatabaseUrlFromEnvFile(fileSystem.readText(envFilePath));
}

function resolveRepositoryRoot(
	options: ResolveDatabaseUrlOptions,
	fileSystem: FileSystemPort,
): string {
	if (options.repositoryRoot) {
		return path.resolve(options.repositoryRoot);
	}

	const defaultStartDirectory = path.dirname(fileURLToPath(import.meta.url));

	return findRepositoryRoot(
		options.startDirectory ?? defaultStartDirectory,
		fileSystem,
	);
}

function missingDatabaseError(): Error {
	return new Error(
		[
			"GUIDE-018 I5.5 database test gate blocked:",
			"DATABASE_URL is required under CI or REQUIRE_DATABASE_TESTS=1.",
			"CI must receive DATABASE_URL through its injected environment.",
			"Local execution may use the repository-root .env.local file.",
			"A skipped database suite is not passing evidence.",
			"Owner: Platform.",
		].join(" "),
	);
}

export function resolveDatabaseUrlForTests(
	options: ResolveDatabaseUrlOptions = {},
): DatabaseForTests {
	const environment = options.environment ?? process.env;
	const fileSystem = options.fileSystem ?? nodeFileSystem;
	const runningInCi = isCiEnvironment(environment);
	const environmentDatabaseUrl = normalizeNonEmptyValue(
		environment.DATABASE_URL,
	);

	let databaseUrl = environmentDatabaseUrl;
	let source: DatabaseUrlSource = environmentDatabaseUrl
		? "environment"
		: "missing";

	if (!(databaseUrl || runningInCi)) {
		const repositoryRoot = resolveRepositoryRoot(options, fileSystem);
		databaseUrl = loadDatabaseUrlFromEnvLocal(repositoryRoot, fileSystem);

		if (databaseUrl) {
			source = "env-local";
		}
	}

	const hasDatabase = databaseUrl !== undefined;

	if (isDatabaseRequired(environment) && !hasDatabase) {
		throw missingDatabaseError();
	}

	if (databaseUrl) {
		environment.DATABASE_URL = databaseUrl;
	}

	return {
		databaseUrl,
		hasDatabase,
		source,
	};
}
