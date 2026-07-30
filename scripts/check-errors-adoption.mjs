import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOT = process.cwd();
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
const ERROR_HTTP_IMPORT_PATTERN = /from\s+["']@afenda\/errors\/http["']/u;
const UNSUPPORTED_ERROR_IMPORT_PATTERN =
	/(?:import\s*\(\s*["']@afenda\/errors(?:\/[^"']*)?["']\s*\)|require\s*\(\s*["']@afenda\/errors(?:\/[^"']*)?["']\s*\))/u;
const RESULT_PATTERN = /\b(?:Promise<)?Result</u;
const APP_ERROR_PATTERN = /\bAppError\b/u;
const NORMALIZER_PATTERN =
	/\b(?:failFromUnknown|normalizeUnknown|normalizePostgresUnknown|failFromAppError|mapPersistenceFailure|translateCorporateAdministrationInfrastructureError|actionFailFromUnknown|actionFailInternal)\b/u;
const POSTGRES_MAPPING_PATTERN = /\bnormalizePostgresUnknown\b/u;
const SHARED_POSTGRES_MAPPER_PATTERN =
	/\b(?:mapPersistenceFailure|translateCorporateAdministrationInfrastructureError)\b/u;
const HTTP_PROJECTION_PATTERN =
	/\b(?:projectHttpError|httpErrorBody|apiErrorBody|ERROR_HTTP_STATUS|API_ERROR_HTTP_STATUS|API_ERROR_CODES|ERROR_CODES|ApiErrorCode|ErrorCode|retryAfterSeconds)\b/u;
const APP_ERROR_FACTORY_PATTERN =
	/\b(?:badRequest|unauthorized|forbidden|notFound|conflict|validationError|rateLimited|serviceUnavailable|internalError|new\s+AppError)\b/u;
const CATCH_PATTERN = /\bcatch(?:\s*\([^)]*\))?\s*\{/u;
const DB_IMPORT_PATTERN =
	/from\s+["'](?:@afenda\/db|drizzle-orm(?:\/[^"']*)?|@neondatabase\/serverless|postgres|pg)["']/u;
const FAILURE_CONSTRUCTION_PATTERN =
	/\b(?:fail|failFromAppError|failFromUnknown|actionFail)\s*\(|return\s+\{\s*ok:\s*false\b/u;
const UNEXPECTED_FAILURE_CONSTRUCTION_PATTERN =
	/\b(?:fail|actionFail)\s*\(\s*["']INTERNAL_ERROR["']|return\s+\{\s*ok:\s*false\b/u;
const CATCH_START_PATTERN = /\bcatch(?:\s*\([^)]*\))?\s*\{/gu;
const RUNTIME_FAILURE_SURFACE_PATTERN =
	/(?:\bcatch(?:\s*\([^)]*\))?\s*\{|\bthrow\s+new\s+Error|\bResponse\.json\b|\bNextResponse\b|\bfetch\s*\()/u;

const PURE_OR_SCHEMA_PACKAGES = new Set([
	"@afenda/config",
	"@afenda/db",
	"@afenda/env",
	"@afenda/testing",
]);

const UI_PRIMITIVE_PACKAGES = new Set([
	"@afenda/ui-blocks",
	"@afenda/ui-system",
]);

const REVIEW_PACKAGES = new Set([
	"@afenda/docs",
	"@afenda/storybook",
	"@afenda/emails",
]);

const MUST_CONSUME_PACKAGES = new Map([
	["@afenda/http", "HTTP response and retry metadata projection boundary"],
	["@afenda/openapi", "OpenAPI error-code vocabulary projection boundary"],
	[
		"@afenda/ai-the-machine",
		"AI provider boundary projects failures into AppError factories",
	],
]);

const EXEMPT_PACKAGES = new Map([
	[
		"@afenda/metrics",
		"best-effort telemetry package; invalid inputs are programmer errors, not public failure contracts",
	],
	[
		"@afenda/security",
		"security header and CORS utility package; configuration errors are programmer errors",
	],
	[
		"@afenda/logger",
		"logging sink package; does not represent application failure contracts",
	],
	[
		"@afenda/emails",
		"email template surface receives display-ready state; callers own delivery and render failure handling",
	],
	[
		"@afenda/docs",
		"documentation app and content tooling; not a product failure boundary",
	],
	[
		"@afenda/storybook",
		"design-system development harness; not a product failure boundary",
	],
]);

function normalizedRelative(root, pathname) {
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
	if (packageName === "@afenda/errors") {
		return "errors-kernel";
	}
	if (packageRoot.startsWith("packages/data-plane/")) {
		return "data-plane";
	}
	if (packageRoot.startsWith("packages/erp/")) {
		return "erp";
	}
	if (packageRoot.startsWith("packages/control-plane/")) {
		return "control-plane";
	}
	if (packageRoot.startsWith("packages/runtime/")) {
		return "runtime";
	}
	if (packageRoot.startsWith("apps/web")) {
		return "web";
	}
	if (packageRoot.startsWith("packages/surfaces/")) {
		return "surface";
	}
	if (packageRoot.startsWith("apps/")) {
		return "app";
	}
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
		if (SKIP_DIR.has(name)) {
			continue;
		}

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
	const roots = packageRoot.startsWith("apps/")
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
		if (SKIP_DIR.has(name)) {
			continue;
		}

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

function readSourceFiles(sourceFiles, root) {
	return sourceFiles.map((file) => ({
		absolutePath: file,
		relativePath: normalizedRelative(root, file),
		content: readFileSync(file, "utf8"),
	}));
}

function hasHardenedSharedPostgresMapper(sources) {
	return sources.some(({ relativePath, content }) => {
		if (
			!(
				relativePath.endsWith("/shared/persistence-errors.ts") ||
				relativePath.endsWith("/adapters/drizzle/errors.ts")
			)
		) {
			return false;
		}
		return POSTGRES_MAPPING_PATTERN.test(content);
	});
}

function catchBlocks(content) {
	const blocks = [];
	CATCH_START_PATTERN.lastIndex = 0;
	let match = CATCH_START_PATTERN.exec(content);
	while (match !== null) {
		let depth = 1;
		let index = CATCH_START_PATTERN.lastIndex;
		while (index < content.length && depth > 0) {
			const char = content[index];
			if (char === "{") {
				depth += 1;
			}
			if (char === "}") {
				depth -= 1;
			}
			index += 1;
		}
		blocks.push(content.slice(CATCH_START_PATTERN.lastIndex, index - 1));
		CATCH_START_PATTERN.lastIndex = index;
		match = CATCH_START_PATTERN.exec(content);
	}
	return blocks;
}

function classifyPackage({ packageRoot, packageName, kind, sources }) {
	if (packageName === "@afenda/errors") {
		return {
			classification: "must-consume",
			reason: "protected error kernel",
		};
	}

	const mustConsumeReason = MUST_CONSUME_PACKAGES.get(packageName);
	if (mustConsumeReason !== undefined) {
		return {
			classification: "must-consume",
			reason: mustConsumeReason,
		};
	}

	const exemptReason = EXEMPT_PACKAGES.get(packageName);
	if (exemptReason !== undefined) {
		return {
			classification: "must-not-consume",
			reason: exemptReason,
		};
	}

	if (PURE_OR_SCHEMA_PACKAGES.has(packageName)) {
		return {
			classification: "must-not-consume",
			reason: "pure configuration, testing, or schema/migration host",
		};
	}

	if (UI_PRIMITIVE_PACKAGES.has(packageName)) {
		return {
			classification: "must-not-consume",
			reason: "UI primitive/surface package should receive display-ready state",
		};
	}

	if (
		packageRoot === "apps/web" ||
		kind === "erp" ||
		kind === "control-plane"
	) {
		return {
			classification: "must-consume",
			reason: "public package or orchestration boundary",
		};
	}

	if (kind === "data-plane") {
		return {
			classification: "must-consume",
			reason: "data-plane repository or persistence boundary",
		};
	}

	if (kind === "runtime") {
		const hasPublicFailureSurface = sources.some(({ content }) =>
			RUNTIME_FAILURE_SURFACE_PATTERN.test(content),
		);
		return hasPublicFailureSurface
			? {
					classification: "must-consume",
					reason: "runtime boundary with public failure surfaces",
				}
			: {
					classification: "review",
					reason: "runtime package needs source inspection before mandate",
				};
	}

	if (
		REVIEW_PACKAGES.has(packageName) ||
		kind === "app" ||
		kind === "surface"
	) {
		return {
			classification: "review",
			reason: "docs, storybook, surface, or runtime package needs inspection",
		};
	}

	return {
		classification: "review",
		reason: "no conservative mandate classification matched",
	};
}

function summarizeMethods(metrics) {
	const methods = [];

	if (metrics.packageName === "@afenda/errors") {
		methods.push("protected-kernel");
	}
	if (metrics.resultEvidenceFiles > 0) {
		methods.push("result-boundary");
	}
	if (metrics.normalizedCatchFiles > 0) {
		methods.push("normalized-catch");
	}
	if (metrics.postgresMappedDbCatchFiles > 0) {
		methods.push("postgres-adapter");
	}
	if (metrics.sharedPersistenceMapperFiles > 0) {
		methods.push("shared-persistence-mapper");
	}
	if (metrics.httpProjectionFiles > 0) {
		methods.push("http-projection");
	}
	if (metrics.appErrorFactoryFiles > 0) {
		methods.push("app-error-factory");
	}

	return methods;
}

function auditCategoryForStatus(status, classification) {
	switch (status) {
		case "ADOPTED":
			return "CANONICAL";
		case "EXEMPT":
			return "EXEMPT";
		case "PARTIAL":
			return "INCONSISTENT";
		case "MISSING":
			return classification === "must-consume" ? "REVIEW" : "EXEMPT";
		case "VIOLATION":
			return "UNSAFE";
		default:
			return "REVIEW";
	}
}

function hasAdoptionEvidence({
	resultEvidenceFiles,
	normalizedCatchFiles,
	postgresMappedDbCatchFiles,
	sharedPersistenceMapperFiles,
	httpProjectionFiles,
	appErrorFactoryFiles,
}) {
	return (
		resultEvidenceFiles > 0 ||
		normalizedCatchFiles > 0 ||
		postgresMappedDbCatchFiles > 0 ||
		sharedPersistenceMapperFiles > 0 ||
		httpProjectionFiles > 0 ||
		appErrorFactoryFiles > 0
	);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This audit intentionally evaluates one ordered package-evidence contract in a single pass.
function analyzePackage(packageJsonPath, root) {
	const packageRootPath = dirname(packageJsonPath);
	const packageRoot = normalizedRelative(root, packageRootPath);
	const pkg = readJson(packageJsonPath);
	const sourceFiles = sourceRootsFor(packageRootPath, packageRoot).flatMap(
		(sourceRoot) => walkSource(sourceRoot),
	);
	const sources = readSourceFiles(sourceFiles, root);
	const declared = hasErrorsDependency(pkg);
	const kind = packageKind(packageRoot, pkg.name);
	const classifier = classifyPackage({
		packageRoot,
		packageName: pkg.name,
		kind,
		sources,
	});
	const issues = [];
	let sourceImports = 0;
	let unsupportedSourceImports = 0;
	let resultEvidenceFiles = 0;
	let catchFiles = 0;
	let normalizedCatchFiles = 0;
	let dbCatchFiles = 0;
	let postgresMappedDbCatchFiles = 0;
	let sharedPersistenceMapperFiles = 0;
	let httpProjectionFiles = 0;
	let appErrorFactoryFiles = 0;
	const dbCatchFileList = [];
	const unnormalizedCatchFileList = [];
	const unsupportedImportFileList = [];
	const hasSharedPostgresMapper = hasHardenedSharedPostgresMapper(sources);

	for (const { relativePath, content } of sources) {
		const importsErrors = ERROR_IMPORT_PATTERN.test(content);
		const hasUnsupportedErrorImport =
			UNSUPPORTED_ERROR_IMPORT_PATTERN.test(content);
		const hasResultSurface =
			RESULT_PATTERN.test(content) ||
			(importsErrors && APP_ERROR_PATTERN.test(content));
		const hasCatch = CATCH_PATTERN.test(content);
		const catches = catchBlocks(content);
		const hasNormalizer = NORMALIZER_PATTERN.test(content);
		const isDbBoundary = DB_IMPORT_PATTERN.test(content);
		const hasPostgresMapping = POSTGRES_MAPPING_PATTERN.test(content);
		const usesSharedPostgresMapper =
			hasSharedPostgresMapper && SHARED_POSTGRES_MAPPER_PATTERN.test(content);
		const constructsFailure = FAILURE_CONSTRUCTION_PATTERN.test(content);
		const hasFailureCatch = catches.some((block) =>
			FAILURE_CONSTRUCTION_PATTERN.test(block),
		);
		const hasHttpProjection =
			ERROR_HTTP_IMPORT_PATTERN.test(content) ||
			(importsErrors && HTTP_PROJECTION_PATTERN.test(content));
		const hasAppErrorFactory =
			importsErrors && APP_ERROR_FACTORY_PATTERN.test(content);

		if (importsErrors) {
			sourceImports += 1;
		}
		if (hasUnsupportedErrorImport) {
			unsupportedSourceImports += 1;
			unsupportedImportFileList.push(relativePath);
		}
		if (hasResultSurface) {
			resultEvidenceFiles += 1;
		}
		if (hasCatch) {
			catchFiles += 1;
		}
		if (hasCatch && hasNormalizer) {
			normalizedCatchFiles += 1;
		}
		if (hasCatch && isDbBoundary && hasFailureCatch) {
			dbCatchFiles += 1;
		}
		if (
			hasCatch &&
			isDbBoundary &&
			hasFailureCatch &&
			(hasPostgresMapping || usesSharedPostgresMapper)
		) {
			postgresMappedDbCatchFiles += 1;
		}
		if (usesSharedPostgresMapper) {
			sharedPersistenceMapperFiles += 1;
		}
		if (hasHttpProjection) {
			httpProjectionFiles += 1;
		}
		if (hasAppErrorFactory) {
			appErrorFactoryFiles += 1;
		}
		if (hasCatch && constructsFailure && !hasNormalizer) {
			const hasUnnormalizedFailureCatch = catches.some(
				(block) =>
					UNEXPECTED_FAILURE_CONSTRUCTION_PATTERN.test(block) &&
					!NORMALIZER_PATTERN.test(block),
			);
			if (hasUnnormalizedFailureCatch) {
				unnormalizedCatchFileList.push(relativePath);
			}
		}
		if (
			hasCatch &&
			isDbBoundary &&
			hasFailureCatch &&
			!hasPostgresMapping &&
			!usesSharedPostgresMapper
		) {
			dbCatchFileList.push(relativePath);
		}
	}

	if (declared && pkg.name !== "@afenda/errors" && sourceImports === 0) {
		issues.push("declares @afenda/errors but has no runtime source import");
	}

	if (unsupportedSourceImports > 0) {
		issues.push(
			"uses unsupported dynamic import or require for @afenda/errors; use static ESM imports",
		);
	}

	if (
		classifier.classification === "must-not-consume" &&
		(declared || sourceImports > 0 || unsupportedSourceImports > 0)
	) {
		issues.push("must-not-consume package depends on @afenda/errors");
	}

	if (
		["erp", "control-plane", "runtime"].includes(kind) &&
		declared &&
		sourceFiles.length > 0 &&
		!hasAdoptionEvidence({
			resultEvidenceFiles,
			normalizedCatchFiles,
			postgresMappedDbCatchFiles,
			sharedPersistenceMapperFiles,
			httpProjectionFiles,
			appErrorFactoryFiles,
		})
	) {
		issues.push("has no shared error adoption evidence in source");
	}

	if (unnormalizedCatchFileList.length > 0 && declared) {
		issues.push("contains catch blocks without shared normalization evidence");
	}

	if (dbCatchFiles > 0 && postgresMappedDbCatchFiles < dbCatchFiles) {
		issues.push(
			"database catch files must explicitly use normalizePostgresUnknown",
		);
	}

	let status = "REVIEW";
	if (pkg.name === "@afenda/errors") {
		status = "ADOPTED";
	} else if (classifier.classification === "must-not-consume") {
		status =
			declared || sourceImports > 0 || unsupportedSourceImports > 0
				? "VIOLATION"
				: "EXEMPT";
	} else if (classifier.classification === "review") {
		status = "REVIEW";
	} else if (!declared) {
		status = "MISSING";
	} else if (issues.length > 0) {
		status = sourceImports > 0 ? "PARTIAL" : "MISSING";
	} else if (declared && issues.length === 0) {
		status = "ADOPTED";
	}

	const methodSummary = summarizeMethods({
		packageName: pkg.name,
		resultEvidenceFiles,
		normalizedCatchFiles,
		postgresMappedDbCatchFiles,
		sharedPersistenceMapperFiles,
		httpProjectionFiles,
		appErrorFactoryFiles,
	});

	return {
		root: packageRoot,
		name: pkg.name,
		auditCategory: auditCategoryForStatus(status, classifier.classification),
		classification: classifier.classification,
		classificationReason: classifier.reason,
		kind,
		declared,
		sourceFiles: sources.map(({ relativePath }) => relativePath),
		sourceImports,
		unsupportedSourceImports,
		resultEvidenceFiles,
		catchFiles,
		normalizedCatchFiles,
		dbCatchFiles,
		postgresMappedDbCatchFiles,
		sharedPersistenceMapperFiles,
		httpProjectionFiles,
		appErrorFactoryFiles,
		dbCatchFileList,
		unnormalizedCatchFileList,
		unsupportedImportFileList,
		status,
		methodSummary,
		issues,
	};
}

function sortReports(reports) {
	return [...reports].sort((left, right) =>
		left.root.localeCompare(right.root),
	);
}

export function buildErrorsAdoptionReport({
	root = DEFAULT_ROOT,
	strict = false,
} = {}) {
	const reports = sortReports(
		[
			...collectPackageJson(join(root, "packages")),
			...collectPackageJson(join(root, "apps")),
		].map((packageJson) => analyzePackage(packageJson, root)),
	);
	const shouldConsumeButNotConsuming = reports.filter(
		(report) =>
			report.classification === "must-consume" &&
			report.status === "MISSING" &&
			report.name !== "@afenda/errors",
	);
	const consumingButNotAdopted = reports.filter(
		(report) => report.status === "PARTIAL",
	);
	const adopted = reports.filter((report) => report.status === "ADOPTED");
	const exempt = reports.filter((report) => report.status === "EXEMPT");
	const review = reports.filter((report) => report.status === "REVIEW");
	const violations = reports.filter((report) => report.status === "VIOLATION");
	const strictFailure = strict && shouldConsumeButNotConsuming.length > 0;
	const incompleteConsumerFailure = consumingButNotAdopted.length > 0;
	const violationFailure = violations.length > 0;
	const status =
		strictFailure || incompleteConsumerFailure || violationFailure
			? "fail"
			: "ok";

	return {
		summary: {
			strict,
			totalPackages: reports.length,
			applicablePackages: adopted.length + consumingButNotAdopted.length,
			adoptedPackages: adopted.length,
			consumingButNotAdoptedPackages: consumingButNotAdopted.length,
			shouldConsumeButNotConsumingPackages: shouldConsumeButNotConsuming.length,
			exemptPackages: exempt.length,
			reviewPackages: review.length,
			violationPackages: violations.length,
			strictFailure,
			incompleteConsumerFailure,
			violationFailure,
			status,
		},
		shouldConsumeButNotConsuming,
		consumingButNotAdopted,
		adopted,
		exempt,
		review,
		violations,
		packages: reports,
	};
}

function formatPackageLine(report) {
	const methods =
		report.methodSummary.length > 0 ? report.methodSummary.join(",") : "none";
	return [
		`- ${report.name} (${report.root})`,
		`category=${report.auditCategory}`,
		`status=${report.status}`,
		`classification=${report.classification}`,
		`methods=${methods}`,
		`imports=${report.sourceImports}`,
		`resultEvidenceFiles=${report.resultEvidenceFiles}`,
		`catchFiles=${report.catchFiles}`,
		`normalizedCatchFiles=${report.normalizedCatchFiles}`,
		`dbCatchFiles=${report.dbCatchFiles}`,
		`postgresMappedDbCatchFiles=${report.postgresMappedDbCatchFiles}`,
	].join(" ");
}

function formatIssueLines(report) {
	const lines = [];
	for (const issue of report.issues) {
		lines.push(`  issue: ${issue}`);
	}
	for (const file of report.unnormalizedCatchFileList.slice(0, 5)) {
		lines.push(`  unnormalizedCatch: ${file}`);
	}
	for (const file of report.dbCatchFileList.slice(0, 5)) {
		lines.push(`  dbCatchWithoutPostgresMap: ${file}`);
	}
	for (const file of report.unsupportedImportFileList.slice(0, 5)) {
		lines.push(`  unsupportedImport: ${file}`);
	}
	return lines;
}

function appendGroup(lines, title, reports, { includeIssues = false } = {}) {
	lines.push("");
	lines.push(`${title} (${reports.length})`);
	if (reports.length === 0) {
		lines.push("- none");
		return;
	}

	for (const report of reports) {
		lines.push(formatPackageLine(report));
		if (includeIssues) {
			lines.push(...formatIssueLines(report));
		}
	}
}

export function formatHumanReport(report) {
	const lines = ["check-errors-adoption: package report"];
	appendGroup(
		lines,
		"should consume but not consuming (advisory)",
		report.shouldConsumeButNotConsuming,
	);
	appendGroup(
		lines,
		"consuming but not adopted",
		report.consumingButNotAdopted,
		{ includeIssues: true },
	);
	appendGroup(lines, "adopted", report.adopted);
	appendGroup(lines, "exempt", report.exempt);
	appendGroup(lines, "review", report.review);
	appendGroup(lines, "violations", report.violations, { includeIssues: true });

	if (report.summary.status === "fail") {
		lines.push(
			`check-errors-adoption: FAIL (${report.consumingButNotAdopted.length} partial, ${report.shouldConsumeButNotConsuming.length} missing mandatory, ${report.violations.length} violations, strict=${report.summary.strict})`,
		);
	} else {
		lines.push(
			`check-errors-adoption: ok (${report.summary.applicablePackages} adopted/partial applicable packages, strict=${report.summary.strict})`,
		);
	}

	return lines.join("\n");
}

export function parseOutputFormat(argv) {
	let format = "human";
	let strict = false;

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "--strict") {
			strict = true;
			continue;
		}
		if (argument === "--json") {
			format = "json";
			continue;
		}
		if (argument === "--format") {
			const value = argv[index + 1];
			if (!["human", "json", "both"].includes(value)) {
				throw new Error("--format must be one of: human, json, both");
			}
			format = value;
			index += 1;
			continue;
		}
		if (argument?.startsWith("--format=")) {
			const value = argument.slice("--format=".length);
			if (!["human", "json", "both"].includes(value)) {
				throw new Error("--format must be one of: human, json, both");
			}
			format = value;
			continue;
		}
		throw new Error(`unknown argument: ${argument}`);
	}

	return { format, strict };
}

export function runCli(argv = process.argv.slice(2), root = DEFAULT_ROOT) {
	const { format, strict } = parseOutputFormat(argv);
	const report = buildErrorsAdoptionReport({ root, strict });

	if (format === "human" || format === "both") {
		const output = formatHumanReport(report);
		if (report.summary.status === "fail") {
			console.error(output);
		} else {
			console.log(output);
		}
	}

	if (format === "json" || format === "both") {
		console.log(JSON.stringify(report, null, 2));
	}

	return report.summary.status === "fail" ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.exitCode = runCli();
}
