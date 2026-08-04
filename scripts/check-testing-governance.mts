import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { testingPolicy } from "@afenda/testing";
import fg from "fast-glob";

const APPROVED_DIRECT_DATABASE_URL_TEST_FILES =
	testingPolicy.approvedDirectDatabaseUrlTestFiles;
const APPROVED_TESTING_CONFIG_FILES = testingPolicy.configFiles;
const FORBIDDEN_TEST_RUNNERS = testingPolicy.forbiddenRunners;
const TESTING_LANES = testingPolicy.lanes;
const TESTING_POLICY_BOUND_CONFIG_FILES = testingPolicy.policyBoundConfigFiles;

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const WINDOWS_DRIVE_PREFIX_PATTERN = /^[A-Z]:/i;
const VITEST_CONFIG_FILENAME_PATTERN = /^vitest\..*config\.(ts|mts|js|mjs)$/;
const PLAYWRIGHT_CONFIG_FILENAME_PATTERN =
	/^playwright\..*config\.(ts|mts|js|mjs)$/;
const SCRIPT_SOURCE_FILENAME_PATTERN = /\.(mjs|mts|ts|tsx)$/;
const STATIC_TESTING_SOURCE_IMPORT_PATTERN =
	/from\s+["'][^"']*packages\/foundation\/testing\/src\/[^"']*["']/;
const DYNAMIC_TESTING_SOURCE_IMPORT_PATTERN =
	/import\(["'][^"']*packages\/foundation\/testing\/src\/[^"']*["']\)/;
const TESTING_SUBPATH_IMPORT_PATTERN =
	/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["'](@afenda\/testing\/[^"']+)["']/g;
const ALLOWED_TESTING_SETUP_IMPORTS = new Set([
	"@afenda/testing/setup/database",
	"@afenda/testing/setup/required-database",
]);
const DIRECT_DATABASE_URL_PATTERN = /process\.env\.DATABASE_URL/;
const WORD_DATABASE_URL_PATTERN = /\bprocess\.env\.DATABASE_URL\b/;
const VITEST_RUN_PATTERN = /\bvitest\s+run\b/;
const PLAYWRIGHT_TEST_PATTERN = /\bplaywright\s+test\b/;
const CONFIG_REFERENCE_PATTERN = /--config(?:=|\s+)([^\s]+)/g;
const PACKAGE_SOURCE_TEST_PATTERN = /\/src\/.+\.(test|spec)\.(ts|tsx)$/;
const TEST_FILENAME_PATTERN = /\.(test|spec)\.(ts|tsx)$/;
// Placement governs every runner-agnostic test extension, not just TypeScript.
const ANY_TEST_FILENAME_PATTERN =
	/\.(test|spec)\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const DATABASE_GATE_CALL_PATTERN = /\btestingDatabase\.resolve\s*\(/;
const RAW_WORKSPACE_TEST_CONCURRENCY_PATTERN =
	/\bturbo\b.*--concurrency(?:=|\s)/;
const ROOT_TEST_SCRIPT =
	"node --experimental-strip-types testing/run-workspace-tests.mts";

type PackageJson = Readonly<{
	name?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}>;

const LANE_OVERLAP_ALLOWED = new Set([
	"e2e-adverse::e2e-all",
	"e2e-all::e2e-journey",
	"e2e-all::e2e-smoke",
	"e2e-adverse::e2e-smoke",
	"master-data-core-parity::master-data-parity",
	"master-data-core-parity::master-data-memory-parity",
	"master-data-memory-parity::master-data-parity",
]);

function normalizePath(target: string): string {
	return target.replaceAll("\\", "/").replace(WINDOWS_DRIVE_PREFIX_PATTERN, "");
}

function repoPath(target: string): string {
	return normalizePath(path.relative(repoRoot, target));
}

function readJson<T>(target: string): T {
	return JSON.parse(fs.readFileSync(target, "utf8")) as T;
}

function disallowedTestingSubpathImports(source: string): string[] {
	return [...source.matchAll(TESTING_SUBPATH_IMPORT_PATTERN)]
		.map((match) => match[1] ?? "")
		.filter(
			(specifier) =>
				specifier.length > 0 && !ALLOWED_TESTING_SETUP_IMPORTS.has(specifier),
		);
}

function assertTestingSubpathDetectorContract(errors: string[]): void {
	const rejectedFixtures = [
		'import { legacy } from "@afenda/testing/legacy";',
		'export { legacy } from "@afenda/testing/legacy";',
		'import("@afenda/testing/legacy");',
		'import "@afenda/testing/legacy";',
	];
	const allowedFixtures = [
		'import { testingPolicy } from "@afenda/testing";',
		'import "@afenda/testing/setup/database";',
		'import "@afenda/testing/setup/required-database";',
	];

	for (const fixture of rejectedFixtures) {
		if (disallowedTestingSubpathImports(fixture).length === 0) {
			errors.push(
				`Testing subpath detector missed rejection fixture: ${fixture}`,
			);
		}
	}

	for (const fixture of allowedFixtures) {
		if (disallowedTestingSubpathImports(fixture).length > 0) {
			errors.push(
				`Testing subpath detector rejected approved fixture: ${fixture}`,
			);
		}
	}
}

function walkFiles(
	directory: string,
	predicate: (filePath: string) => boolean,
): string[] {
	if (!fs.existsSync(directory)) {
		return [];
	}

	const found: string[] = [];
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		if (
			entry.name === "node_modules" ||
			entry.name === ".next" ||
			entry.name === ".turbo"
		) {
			continue;
		}

		if (
			entry.name === "_reference" ||
			entry.name === "dist" ||
			entry.name === "coverage"
		) {
			continue;
		}

		const absolutePath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			found.push(...walkFiles(absolutePath, predicate));
			continue;
		}

		if (predicate(absolutePath)) {
			found.push(repoPath(absolutePath));
		}
	}

	return found.sort((first, second) => first.localeCompare(second));
}

function normalizeConfigReference(
	packageJsonPath: string,
	configReference: string,
): string {
	const normalizedReference = normalizePath(configReference);

	for (const approvedConfigFile of APPROVED_TESTING_CONFIG_FILES) {
		if (normalizedReference.endsWith(approvedConfigFile)) {
			return approvedConfigFile;
		}

		const approvedBasename = path.posix.basename(approvedConfigFile);
		if (
			normalizedReference === approvedBasename &&
			approvedConfigFile.startsWith(
				`${path.posix.dirname(repoPath(packageJsonPath))}/`,
			)
		) {
			return approvedConfigFile;
		}
	}

	return normalizePath(
		path.normalize(
			path.join(path.dirname(repoPath(packageJsonPath)), configReference),
		),
	);
}

function listPackageJsonFiles(): string[] {
	return [
		path.join(repoRoot, "package.json"),
		...walkFiles(
			path.join(repoRoot, "apps"),
			(filePath) => path.basename(filePath) === "package.json",
		).map((filePath) => path.join(repoRoot, filePath)),
		...walkFiles(
			path.join(repoRoot, "packages"),
			(filePath) => path.basename(filePath) === "package.json",
		).map((filePath) => path.join(repoRoot, filePath)),
	];
}

function collectPackageJsons(): Array<{ filePath: string; pkg: PackageJson }> {
	return listPackageJsonFiles().map((filePath) => ({
		filePath,
		pkg: readJson<PackageJson>(filePath),
	}));
}

function hasForbiddenRunnerDependency(pkg: PackageJson): string[] {
	const dependencies = {
		...pkg.dependencies,
		...pkg.devDependencies,
	};

	return Object.keys(dependencies).filter((name) =>
		FORBIDDEN_TEST_RUNNERS.some(
			(forbidden) => name === forbidden || name.startsWith(`${forbidden}/`),
		),
	);
}

function assertNoRogueRunnerConfigs(errors: string[]): void {
	const runnerConfigs = walkFiles(repoRoot, (filePath) => {
		const name = path.basename(filePath);
		return (
			VITEST_CONFIG_FILENAME_PATTERN.test(name) ||
			PLAYWRIGHT_CONFIG_FILENAME_PATTERN.test(name) ||
			name === "playwright.config.ts" ||
			name === "vitest.config.ts"
		);
	});

	const approved = new Set(APPROVED_TESTING_CONFIG_FILES);
	for (const configFile of runnerConfigs) {
		if (
			!approved.has(
				configFile as (typeof APPROVED_TESTING_CONFIG_FILES)[number],
			)
		) {
			errors.push(`Unregistered test runner config: ${configFile}`);
		}
	}
}

function assertLaneControlFilesExist(errors: string[]): void {
	for (const configFile of APPROVED_TESTING_CONFIG_FILES) {
		if (!fs.existsSync(path.join(repoRoot, configFile))) {
			errors.push(`Approved testing config missing on disk: ${configFile}`);
		}
	}

	for (const lane of TESTING_LANES) {
		if (!APPROVED_TESTING_CONFIG_FILES.includes(lane.controlFile as never)) {
			errors.push(
				`Lane ${lane.id} points at unapproved control file: ${lane.controlFile}`,
			);
		}
	}
}

function assertPolicyBoundConfigsExtendRegistry(errors: string[]): void {
	for (const configFile of TESTING_POLICY_BOUND_CONFIG_FILES) {
		const source = fs.readFileSync(path.join(repoRoot, configFile), "utf8");
		if (!source.includes("@afenda/testing")) {
			errors.push(
				`Policy-bound test config must import @afenda/testing control policy: ${configFile}`,
			);
		}
	}
}

function assertNoTestingPackageSourceImports(errors: string[]): void {
	const sourceFiles = walkFiles(repoRoot, (filePath) => {
		const relativePath = repoPath(filePath);

		return (
			SCRIPT_SOURCE_FILENAME_PATTERN.test(relativePath) &&
			!relativePath.startsWith("packages/foundation/testing/") &&
			relativePath !== "scripts/check-testing-governance.mts"
		);
	});

	for (const sourceFile of sourceFiles) {
		const source = fs.readFileSync(path.join(repoRoot, sourceFile), "utf8");
		const importsTestingPackageSource =
			STATIC_TESTING_SOURCE_IMPORT_PATTERN.test(source) ||
			DYNAMIC_TESTING_SOURCE_IMPORT_PATTERN.test(source);

		if (importsTestingPackageSource) {
			errors.push(
				`Use @afenda/testing public exports instead of package source import: ${sourceFile}`,
			);
		}

		const disallowedSubpaths = disallowedTestingSubpathImports(source);
		if (disallowedSubpaths.length > 0) {
			errors.push(
				`Use @afenda/testing root capabilities instead of consumer subpath imports (${disallowedSubpaths.join(", ")}): ${sourceFile}`,
			);
		}
	}
}

function materializeLaneInclude(pattern: string): string[] {
	if (pattern.startsWith("<workspace>/")) {
		const workspacePattern = pattern.replace("<workspace>/", "");

		return [
			`apps/docs/${workspacePattern}`,
			`apps/web/${workspacePattern}`,
			`packages/*/*/${workspacePattern}`,
		];
	}

	return [pattern];
}

function listLaneFiles(lane: (typeof TESTING_LANES)[number]): string[] {
	return fg
		.sync(lane.include.flatMap(materializeLaneInclude), {
			cwd: repoRoot,
			absolute: false,
			dot: false,
			...("exclude" in lane ? { ignore: [...lane.exclude] } : {}),
			onlyFiles: true,
			unique: true,
		})
		.map(normalizePath)
		.sort();
}

function listGovernedTestFiles(): string[] {
	return fg
		.sync(
			[
				"apps/**/__tests__/**/*.{test,spec}.{ts,tsx,mjs}",
				"packages/**/__tests__/**/*.{test,spec}.{ts,tsx,mjs}",
				"scripts/__tests__/**/*.{test,spec}.{ts,tsx,mjs}",
				"governance/scripts/__tests__/**/*.{test,spec}.{ts,tsx,mjs}",
				"e2e/**/*.spec.ts",
			],
			{
				cwd: repoRoot,
				absolute: false,
				dot: false,
				ignore: [
					"**/node_modules/**",
					"**/dist/**",
					"**/.next/**",
					"**/coverage/**",
				],
				onlyFiles: true,
				unique: true,
			},
		)
		.map(normalizePath)
		.sort();
}

function lanePairKey(first: string, second: string): string {
	return [first, second].sort().join("::");
}

function assertLaneFileCoverage(errors: string[]): void {
	const filesByLane = new Map<string, Set<string>>();

	for (const lane of TESTING_LANES) {
		filesByLane.set(lane.id, new Set(listLaneFiles(lane)));
	}

	for (const testFile of listGovernedTestFiles()) {
		const matchingLanes = TESTING_LANES.filter((lane) =>
			filesByLane.get(lane.id)?.has(testFile),
		).map((lane) => lane.id);

		if (matchingLanes.length === 0) {
			errors.push(
				`Test file is outside every declared testing lane: ${testFile}`,
			);
			continue;
		}

		for (let index = 0; index < matchingLanes.length; index += 1) {
			for (
				let nextIndex = index + 1;
				nextIndex < matchingLanes.length;
				nextIndex += 1
			) {
				const pair = lanePairKey(
					matchingLanes[index] ?? "",
					matchingLanes[nextIndex] ?? "",
				);

				if (!LANE_OVERLAP_ALLOWED.has(pair)) {
					errors.push(
						`Test file matches multiple exclusive lanes (${matchingLanes.join(", ")}): ${testFile}`,
					);
				}
			}
		}
	}
}

function assertTestingInfrastructureDatabaseGate(errors: string[]): void {
	const infrastructureFiles = walkFiles(
		path.join(repoRoot, "testing"),
		(filePath) => SCRIPT_SOURCE_FILENAME_PATTERN.test(repoPath(filePath)),
	);

	for (const infrastructureFile of infrastructureFiles) {
		const source = fs.readFileSync(
			path.join(repoRoot, infrastructureFile),
			"utf8",
		);

		if (WORD_DATABASE_URL_PATTERN.test(source)) {
			errors.push(
				`Testing infrastructure must use @afenda/testing database helpers instead of process.env.DATABASE_URL: ${infrastructureFile}`,
			);
		}
	}
}

function assertPackageScriptsUseApprovedRunnerPolicy(errors: string[]): void {
	const approvedConfigFiles = new Set(APPROVED_TESTING_CONFIG_FILES);

	for (const { filePath, pkg } of collectPackageJsons()) {
		for (const [scriptName, command] of Object.entries(pkg.scripts ?? {})) {
			validateRunnerScript(
				{ command, filePath, scriptName },
				approvedConfigFiles,
				errors,
			);
		}
	}
}

function validateRunnerScript(
	input: { command: string; filePath: string; scriptName: string },
	approvedConfigFiles: Set<string>,
	errors: string[],
): void {
	const usesVitest = VITEST_RUN_PATTERN.test(input.command);
	const usesPlaywright = PLAYWRIGHT_TEST_PATTERN.test(input.command);
	if (!(usesVitest || usesPlaywright)) {
		return;
	}

	const relativePackageJson = repoPath(input.filePath);
	const configMatches = [
		...input.command.matchAll(CONFIG_REFERENCE_PATTERN),
	].map((match) => normalizeConfigReference(input.filePath, match[1] ?? ""));
	if (usesVitest && configMatches.length === 0) {
		errors.push(
			`${relativePackageJson} script "${input.scriptName}" runs Vitest without an explicit approved config.`,
		);
		return;
	}

	for (const configPath of configMatches) {
		if (!approvedConfigFiles.has(configPath)) {
			errors.push(
				`${relativePackageJson} script "${input.scriptName}" uses unapproved test config: ${configPath}`,
			);
		}
	}

	if (
		usesPlaywright &&
		configMatches.length === 0 &&
		!relativePackageJson.startsWith("package.json")
	) {
		errors.push(
			`${relativePackageJson} script "${input.scriptName}" runs Playwright without an explicit approved config.`,
		);
	}
}

function assertForbiddenRunnerDependencies(errors: string[]): void {
	for (const { filePath, pkg } of collectPackageJsons()) {
		const forbidden = hasForbiddenRunnerDependency(pkg);
		if (forbidden.length > 0) {
			errors.push(
				`${repoPath(filePath)} declares forbidden test runner dependency: ${forbidden.join(", ")}`,
			);
		}
	}
}

function assertWorkspaceExecutionPolicyBoundary(errors: string[]): void {
	const packageJsons = collectPackageJsons();
	const rootPackage = packageJsons.find(
		({ filePath }) => repoPath(filePath) === "package.json",
	)?.pkg;

	if (rootPackage?.scripts?.test !== ROOT_TEST_SCRIPT) {
		errors.push(
			`package.json script "test" must delegate to the canonical workspace runner: ${ROOT_TEST_SCRIPT}`,
		);
	}
	if (
		rootPackage?.scripts?.["test:affected"] !== `${ROOT_TEST_SCRIPT} --affected`
	) {
		errors.push(
			`package.json script "test:affected" must delegate to the canonical affected workspace runner.`,
		);
	}

	for (const { filePath, pkg } of packageJsons) {
		for (const [scriptName, command] of Object.entries(pkg.scripts ?? {})) {
			if (RAW_WORKSPACE_TEST_CONCURRENCY_PATTERN.test(command)) {
				errors.push(
					`${repoPath(filePath)} script "${scriptName}" owns Turbo concurrency outside @afenda/testing: ${command}`,
				);
			}
		}
	}
}

function assertTestPlacement(errors: string[]): void {
	const misplacedTests = walkFiles(
		path.join(repoRoot, "packages"),
		(filePath) => {
			const relativePath = repoPath(filePath);
			return (
				PACKAGE_SOURCE_TEST_PATTERN.test(relativePath) &&
				!relativePath.includes("/src/testing/")
			);
		},
	);

	for (const testFile of misplacedTests) {
		errors.push(
			`Package test file must live under root __tests__, not src: ${testFile}`,
		);
	}
}

function nonTestsDirLaneFiles(): Set<string> {
	const allowed = new Set<string>();

	for (const lane of TESTING_LANES) {
		for (const laneFile of listLaneFiles(lane)) {
			if (!laneFile.includes("/__tests__/")) {
				allowed.add(laneFile);
			}
		}
	}

	return allowed;
}

function assertAllTestFilesLiveUnderTestsDirectory(errors: string[]): void {
	const allowedOutsideTestsDir = nonTestsDirLaneFiles();

	for (const root of ["apps", "packages", "scripts", "turbo", "testing"]) {
		const candidateTestFiles = walkFiles(
			path.join(repoRoot, root),
			(filePath) => ANY_TEST_FILENAME_PATTERN.test(repoPath(filePath)),
		);

		for (const testFile of candidateTestFiles) {
			if (testFile.includes("/__tests__/")) {
				continue;
			}

			if (allowedOutsideTestsDir.has(testFile)) {
				continue;
			}

			errors.push(
				`Test file must live under a __tests__ directory (or a registered non-__tests__ lane): ${testFile}`,
			);
		}
	}
}

function assertNoForbiddenRunnerModules(errors: string[]): void {
	const forbiddenModulePattern = new RegExp(
		`["'](${testingPolicy.forbiddenRunnerModules.join("|")})["']`,
	);

	for (const root of [
		"apps",
		"packages",
		"scripts",
		"turbo",
		"testing",
		"e2e",
	]) {
		const testFiles = walkFiles(path.join(repoRoot, root), (filePath) =>
			ANY_TEST_FILENAME_PATTERN.test(repoPath(filePath)),
		);

		for (const testFile of testFiles) {
			const source = fs.readFileSync(path.join(repoRoot, testFile), "utf8");

			if (forbiddenModulePattern.test(source)) {
				errors.push(
					`Test uses a banned runner module (use Vitest instead): ${testFile}`,
				);
			}
		}
	}
}

function assertDatabaseGate(errors: string[]): void {
	const approvedDirectReads = new Set(APPROVED_DIRECT_DATABASE_URL_TEST_FILES);
	const dbTestFiles = walkFiles(repoRoot, (filePath) => {
		const relativePath = repoPath(filePath);
		return (
			TEST_FILENAME_PATTERN.test(relativePath) &&
			!relativePath.startsWith("packages/foundation/testing/")
		);
	});

	for (const testFile of dbTestFiles) {
		const absolutePath = path.join(repoRoot, testFile);
		const source = fs.readFileSync(absolutePath, "utf8");
		const readsDatabaseUrl = DIRECT_DATABASE_URL_PATTERN.test(source);
		const usesGate = DATABASE_GATE_CALL_PATTERN.test(source);

		if (
			readsDatabaseUrl &&
			!usesGate &&
			!approvedDirectReads.has(testFile as never)
		) {
			errors.push(
				`DB-backed test reads process.env.DATABASE_URL without @afenda/testing gate: ${testFile}`,
			);
		}
	}
}

const governanceErrors: string[] = [];

assertTestingSubpathDetectorContract(governanceErrors);
assertLaneControlFilesExist(governanceErrors);
assertNoRogueRunnerConfigs(governanceErrors);
assertPolicyBoundConfigsExtendRegistry(governanceErrors);
assertNoTestingPackageSourceImports(governanceErrors);
assertTestingInfrastructureDatabaseGate(governanceErrors);
assertLaneFileCoverage(governanceErrors);
assertPackageScriptsUseApprovedRunnerPolicy(governanceErrors);
assertWorkspaceExecutionPolicyBoundary(governanceErrors);
assertForbiddenRunnerDependencies(governanceErrors);
assertTestPlacement(governanceErrors);
assertAllTestFilesLiveUnderTestsDirectory(governanceErrors);
assertNoForbiddenRunnerModules(governanceErrors);
assertDatabaseGate(governanceErrors);

if (governanceErrors.length > 0) {
	console.error("testing governance failed:");
	for (const error of governanceErrors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

console.log(
	`testing governance OK (${TESTING_LANES.length} lanes, ${APPROVED_TESTING_CONFIG_FILES.length} approved config files)`,
);
