import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const root = process.cwd();
const SKIP_DIR = new Set([
	"node_modules",
	".git",
	".next",
	".turbo",
	"dist",
	"build",
	"coverage",
	"test-results",
	"playwright-report",
	"_reference",
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const ERROR_IMPORT_PATTERN = /from\s+["']@afenda\/errors(?:\/[^"']*)?["']/u;
const RESULT_PATTERN = /\b(?:Promise<)?Result</u;
const APP_ERROR_PATTERN = /\bAppError\b/u;
const NORMALIZER_PATTERN =
	/\b(?:failFromUnknown|normalizeUnknown|fromPostgresUnknown|failFromAppError)\b/u;
const POSTGRES_MAPPING_PATTERN = /\bfromPostgresUnknown\b/u;
const CATCH_PATTERN = /\bcatch\s*\(/u;
const DB_IMPORT_PATTERN = /from\s+["']@afenda\/db["']/u;
const FAILURE_CONSTRUCTION_PATTERN =
	/\b(?:fail|actionFail)\s*\(|return\s+\{\s*ok:\s*false\b/u;

/** @type {{root: string; name: string; declared: boolean; sourceFiles: string[]; sourceImports: number; resultSurfaces: number; catchFiles: number; normalizedCatchFiles: number; dbCatchFiles: number; postgresMappedDbCatchFiles: number; dbCatchFileList: string[]; unnormalizedCatchFileList: string[]; status: string; issues: string[]}[]} */
const reports = [];

function normalizedRelative(pathname) {
	return relative(root, pathname).replace(/\\/g, "/");
}

function isSourceFile(name) {
	const index = name.lastIndexOf(".");
	return index >= 0 && SOURCE_EXTENSIONS.has(name.slice(index));
}

function readJson(pathname) {
	return JSON.parse(readFileSync(pathname, "utf8"));
}

function hasErrorsDependency(pkg) {
	return (
		pkg.name === "@afenda/errors" ||
		pkg.dependencies?.["@afenda/errors"] !== undefined ||
		pkg.devDependencies?.["@afenda/errors"] !== undefined
	);
}

function packageKind(packageRoot, packageName) {
	if (packageName === "@afenda/errors") return "errors-kernel";
	if (packageRoot.startsWith("packages/data-plane/")) return "data-plane";
	if (packageRoot.startsWith("packages/erp/")) return "erp";
	if (packageRoot.startsWith("packages/control-plane/")) return "control-plane";
	if (packageRoot.startsWith("packages/runtime/")) return "runtime";
	if (packageRoot.startsWith("apps/web")) return "web";
	if (packageRoot.startsWith("packages/surfaces/")) return "surface";
	return "other";
}

function walkSource(directory, files = []) {
	let entries;
	try {
		entries = readdirSync(directory);
	} catch {
		return files;
	}

	for (const name of entries) {
		if (SKIP_DIR.has(name)) continue;

		const fullPath = join(directory, name);
		let stats;
		try {
			stats = statSync(fullPath);
		} catch {
			continue;
		}

		if (stats.isDirectory()) {
			walkSource(fullPath, files);
			continue;
		}

		if (stats.isFile() && isSourceFile(name)) {
			files.push(fullPath);
		}
	}

	return files;
}

function sourceRootsFor(packageRootPath, packageRoot) {
	const roots =
		packageRoot.startsWith("apps/")
			? ["app", "lib", "modules", "src"]
			: ["src"];
	return roots.map((name) => join(packageRootPath, name));
}

function collectPackageJson(directory, files = []) {
	let entries;
	try {
		entries = readdirSync(directory);
	} catch {
		return files;
	}

	for (const name of entries) {
		if (SKIP_DIR.has(name)) continue;

		const fullPath = join(directory, name);
		let stats;
		try {
			stats = statSync(fullPath);
		} catch {
			continue;
		}

		if (stats.isDirectory()) {
			collectPackageJson(fullPath, files);
			continue;
		}

		if (stats.isFile() && name === "package.json") {
			files.push(fullPath);
		}
	}

	return files;
}

function analyzePackage(packageJsonPath) {
	const packageRootPath = dirname(packageJsonPath);
	const packageRoot = normalizedRelative(packageRootPath);
	const pkg = readJson(packageJsonPath);
	const sourceFiles = sourceRootsFor(packageRootPath, packageRoot).flatMap((sourceRoot) =>
		walkSource(sourceRoot),
	);
	const declared = hasErrorsDependency(pkg);
	const kind = packageKind(packageRoot, pkg.name);
	const issues = [];
	let sourceImports = 0;
	let resultSurfaces = 0;
	let catchFiles = 0;
	let normalizedCatchFiles = 0;
	let dbCatchFiles = 0;
	let postgresMappedDbCatchFiles = 0;
	const dbCatchFileList = [];
	const unnormalizedCatchFileList = [];

	for (const file of sourceFiles) {
		const content = readFileSync(file, "utf8");
		const importsErrors = ERROR_IMPORT_PATTERN.test(content);
		const hasResultSurface =
			RESULT_PATTERN.test(content) ||
			(importsErrors && APP_ERROR_PATTERN.test(content));
		const hasCatch = CATCH_PATTERN.test(content);
		const hasNormalizer = NORMALIZER_PATTERN.test(content);
		const isDbBoundary = DB_IMPORT_PATTERN.test(content);
		const hasPostgresMapping = POSTGRES_MAPPING_PATTERN.test(content);
		const constructsFailure = FAILURE_CONSTRUCTION_PATTERN.test(content);

		if (importsErrors) sourceImports += 1;
		if (hasResultSurface) resultSurfaces += 1;
		if (hasCatch) catchFiles += 1;
		if (hasCatch && hasNormalizer) normalizedCatchFiles += 1;
		if (hasCatch && isDbBoundary) dbCatchFiles += 1;
		if (hasCatch && isDbBoundary && hasPostgresMapping) {
			postgresMappedDbCatchFiles += 1;
		}
		if (hasCatch && constructsFailure && !hasNormalizer) {
			unnormalizedCatchFileList.push(normalizedRelative(file));
		}
		if (hasCatch && isDbBoundary && !hasPostgresMapping) {
			dbCatchFileList.push(normalizedRelative(file));
		}
	}

	if (declared && pkg.name !== "@afenda/errors" && sourceImports === 0) {
		issues.push("declares @afenda/errors but has no runtime source import");
	}

	if (
		["erp", "control-plane", "runtime"].includes(kind) &&
		declared &&
		sourceFiles.length > 0 &&
		resultSurfaces === 0
	) {
		issues.push("has no Result/AppError public-boundary evidence in source");
	}

	if (unnormalizedCatchFileList.length > 0 && declared) {
		issues.push("contains catch blocks without shared normalization evidence");
	}

	if (dbCatchFiles > 0 && postgresMappedDbCatchFiles < dbCatchFiles) {
		issues.push("database catch files must explicitly use fromPostgresUnknown");
	}

	let status = "NOT_APPLICABLE";
	if (pkg.name === "@afenda/errors") {
		status = "ADOPTED";
	} else if (declared && issues.length === 0) {
		status = "ADOPTED";
	} else if (declared && sourceImports > 0) {
		status = "PARTIAL";
	} else if (declared) {
		status = "NOT_STARTED";
	}

	reports.push({
		root: packageRoot,
		name: pkg.name,
		declared,
		sourceFiles: sourceFiles.map(normalizedRelative),
		sourceImports,
		resultSurfaces,
		catchFiles,
		normalizedCatchFiles,
		dbCatchFiles,
		postgresMappedDbCatchFiles,
		dbCatchFileList,
		unnormalizedCatchFileList,
		status,
		issues,
	});
}

for (const packageJson of [
	...collectPackageJson(join(root, "packages")),
	...collectPackageJson(join(root, "apps")),
]) {
	analyzePackage(packageJson);
}

const applicable = reports.filter((report) => report.status !== "NOT_APPLICABLE");
const failing = applicable.filter((report) => report.status !== "ADOPTED");

console.log("check-errors-adoption: package report");
for (const report of applicable.sort((left, right) =>
	left.root.localeCompare(right.root),
)) {
	console.log(
		[
			`- ${report.name} (${report.root})`,
			`status=${report.status}`,
			`imports=${report.sourceImports}`,
			`resultSurfaces=${report.resultSurfaces}`,
			`catchFiles=${report.catchFiles}`,
			`normalizedCatchFiles=${report.normalizedCatchFiles}`,
			`dbCatchFiles=${report.dbCatchFiles}`,
			`postgresMappedDbCatchFiles=${report.postgresMappedDbCatchFiles}`,
		].join(" "),
	);
	for (const issue of report.issues) {
		console.log(`  issue: ${issue}`);
	}
	for (const file of report.unnormalizedCatchFileList.slice(0, 5)) {
		console.log(`  unnormalizedCatch: ${file}`);
	}
	for (const file of report.dbCatchFileList.slice(0, 5)) {
		console.log(`  dbCatchWithoutPostgresMap: ${file}`);
	}
}

if (failing.length > 0) {
	console.error(
		`check-errors-adoption: FAIL (${failing.length}/${applicable.length} applicable packages incomplete)`,
	);
	process.exit(1);
}

console.log(`check-errors-adoption: ok (${applicable.length} applicable packages)`);
