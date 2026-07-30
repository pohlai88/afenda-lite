import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
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
	"storybook-static",
	"_reference",
]);
const SOURCE_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".mjs",
]);
const AUDIT_ROOTS = [
	"apps",
	"packages",
	"scripts",
	"testing",
	".cursor",
	"docs-V2",
];
const EXCLUDED_PATH_PARTS = [
	"/packages/foundation/errors/",
	"/__tests__/",
	"/test/",
	"/tests/",
	"/fixtures/",
	"/__fixtures__/",
	"/testing/",
];
const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;

const ERROR_IMPORT_PATTERN = /from\s+["']@afenda\/errors(?:\/[^"']*)?["']/u;
const POSTGRES_IMPORT_PATTERN =
	/from\s+["']@afenda\/errors\/adapters\/postgres["']/u;
const RESULT_IMPORT_PATTERN = /from\s+["']@afenda\/errors\/result["']/u;
const HTTP_IMPORT_PATTERN = /from\s+["']@afenda\/errors\/http["']/u;
const NORMALIZER_PATTERN = /\b(?:normalizeUnknown|failFromUnknown)\b/u;
const POSTGRES_MAPPING_PATTERN = /\bfromPostgresUnknown\b/u;
const SERIALIZER_PATTERN = /\bserializeAppError\b/u;
const HTTP_PROJECTION_PATTERN =
	/\b(?:httpErrorBody|apiErrorBody|ERROR_HTTP_STATUS|API_ERROR_HTTP_STATUS|API_ERROR_CODES|ERROR_CODES|ApiErrorCode|ErrorCode|retryAfterSeconds)\b/u;
const RESULT_HELPER_PATTERN =
	/\b(?:ok|fail|failFromAppError|failFromUnknown)\s*\(/u;
const TYPE_CONTRACT_PATTERN =
	/\b(?:import\s+type\s+\{[^}]*\b(?:Result|ResultFailure|ErrorCode|ApiErrorCode|SafeDetails)\b|type\s+Result|type\s+ResultFailure|Result<|ResultFailure|ErrorCode|ApiErrorCode|SafeDetails)\b/u;
const APP_ERROR_FACTORY_PATTERN =
	/\b(?:badRequest|unauthorized|forbidden|notFound|conflict|validationError|rateLimited|serviceUnavailable|internalError|new\s+AppError)\b/u;

const MANUAL_RESULT_CONSTRUCTION_PATTERN =
	/return\s+\{\s*ok:\s*false\s*,\s*(?:code|message|details)\b/u;
const MANUAL_APP_ERROR_COPY_PATTERN =
	/\b(?:return\s+)?fail\s*\(\s*mapped\.code\s*,\s*mapped\.message\s*,\s*mapped\.details\s*\)/u;
const MANUAL_SERIALIZATION_PATTERN =
	/(?:JSON\.stringify\s*\(\s*error\s*\)|(?:Response|NextResponse)\.json\s*\(\s*error\s*\)|return\s+\{\s*error\s*\}|error:\s*\{\s*code\s*,\s*message\s*,\s*details\s*\})/u;
const UNSAFE_PUBLIC_INTERNALS_PATTERN =
	/(?:Response|NextResponse)\.json\s*\(\s*\{[\s\S]{0,500}\b(?:cause|stack)\b/u;
const CANONICAL_SERIALIZATION_DRIFT_PATTERN =
	/\b(?:httpErrorBody|apiErrorBody|jsonError|actionFail)\s*\(\s*(?:input\.)?error\.code\s*,\s*(?:input\.)?error\.message\s*,\s*(?:input\.)?error\.details\b/u;
const MANUAL_HTTP_ERROR_STATUS_PATTERN =
	/(?:Response|NextResponse)\.json\s*\([\s\S]{0,500}(?:httpErrorBody|apiErrorBody|\{\s*error\b)[\s\S]{0,500}\bstatus:\s*(?:400|401|403|404|409|422|429|500|503)\b|new\s+Response\s*\([\s\S]{0,500}(?:httpErrorBody|apiErrorBody|JSON\.stringify\s*\(\s*\{\s*error\b)[\s\S]{0,500}\bstatus:\s*(?:400|401|403|404|409|422|429|500|503)\b/u;
const HTTP_ERROR_BODY_PROJECTION_PATTERN =
	/\b(?:httpErrorBody|apiErrorBody)\s*\(|\{\s*error\s*:\s*\{/u;
const HARDCODED_ERROR_STATUS_PATTERN =
	/\bstatus:\s*(?:400|401|403|404|409|422|429|500|503)\b/u;
const RAW_ERROR_LEAK_PATTERN =
	/(?:error\s+instanceof\s+Error\s*\?\s*error\.message\s*:|new\s+Error\s*\(\s*String\s*\(\s*error\s*\)\s*\)|String\s*\(\s*error\s*\)|return\s+error\.message\s*;|return\s+\{\s*ok:\s*false[\s\S]{0,160}\bmessage:\s*error\.message\b|\bmessage:\s*error\.message\b)/u;
const DUPLICATE_HELPER_NAME_PATTERN =
	/\b(?:function|const)\s+(?:toAppError|mapError|normalizeError|serializeError|toResultFailure)\b/u;
const POSTGRES_TERNARY_DRIFT_PATTERN =
	/(?:mapped\s*(?:===|==)\s*undefined\s*\?\s*failFromAppError\s*\(\s*mapped\s*\)|mapped\s*\?\s*failFromUnknown\s*\(|mapped\s*\?\s*fail\s*\(|:\s*failFromAppError\s*\(\s*undefined\s*\))/u;
const LOCAL_HTTP_STATUS_MAP_PATTERN =
	/\b(?:ERROR_HTTP_STATUS|API_ERROR_HTTP_STATUS)\s*=\s*\{/u;
const LOCAL_RETRY_AFTER_READER_PATTERN =
	/\bfunction\s+retryAfterSeconds\b|\bReflect\.get\s*\([^,]+,\s*["']retryAfter["']\s*\)/u;
const INFRASTRUCTURE_GUESSING_PATTERN =
	/\b(?:fromPostgresUnknown|postgresSqlState|hasPostgresSqlState)\b|["'][^"']*adapters\/postgres["']/u;
const UNKNOWN_CATCH_SWALLOW_PATTERN =
	/\bcatch\s*\(\s*(?:error|err|cause|caught|unknown)\s*\)\s*\{[\s\S]{0,240}\breturn\s+(?:null|false|\[\]|["'][^"']{0,120}["'])\s*;?/u;
const UNSAFE_DETAILS_PASSTHROUGH_PATTERN =
	/\{\s*details\s*:\s*(?:error|err|cause|caught)\b/u;
const DIRECT_APP_ERROR_UI_PATTERN =
	/(?:import(?:\s+type)?\s+\{[^}]*\bAppError\b[^}]*\}\s+from\s+["']@afenda\/errors["'][\s\S]{0,1200}\b(?:function|const)\s+[A-Z][A-Za-z0-9_]*|type\s+\w*Props\s*=\s*\{[\s\S]{0,400}\b(?:error|appError)\s*:\s*AppError\b)/u;
const INCONSISTENT_ERROR_MAPPING_PATTERN =
	/\b(?:fail|actionFail)\s*\(\s*(?:(?:["']INTERNAL_ERROR["']\s*,\s*["'][^"']*\b(?:not found|duplicate|already exists|conflict)\b[^"']*["'])|(?:["']NOT_FOUND["']\s*,\s*["'][^"']*\b(?:duplicate|already exists|invalid)\b[^"']*["'])|(?:["']CONFLICT["']\s*,\s*["'][^"']*\b(?:not found|missing|required|invalid syntax)\b[^"']*["'])|(?:["']VALIDATION_ERROR["']\s*,\s*["'][^"']*\b(?:not found|duplicate|already exists)\b[^"']*["']))/iu;
const RETRYABLE_WITHOUT_METADATA_PATTERN =
	/\b(?:new\s+AppError|serviceUnavailable)\s*\([\s\S]{0,240}\bretryable\s*:\s*true\b(?![\s\S]{0,240}\bdetails\s*:\s*\{[\s\S]{0,120}\bretryable\s*:\s*true\b)/u;
const INTERNAL_ERROR_OPERATIONAL_PATTERN =
	/\bnew\s+AppError\s*\(\s*\{[\s\S]{0,240}\bcode\s*:\s*["']INTERNAL_ERROR["'][\s\S]{0,240}\bisOperational\s*:\s*true\b/u;
const INFRA_CONFIG_CALLER_ERROR_PATTERN =
	/\b(?:badRequest|validationError|fail|actionFail)\s*\(\s*(?:(?:["']BAD_REQUEST["']|["']VALIDATION_ERROR["'])\s*,\s*)?["'][^"']*\b(?:DATABASE_URL|UPSTASH|NEON|APP_URL|configuration|environment|env var|credential|secret|token)\b[^"']*["']/iu;

const CATEGORY_LABELS = {
	canonical: "CANONICAL",
	partial: "INCONSISTENT",
	manualResultConstruction: "INCONSISTENT",
	manualSerialization: "UNSAFE",
	canonicalSerializationDrift: "INCONSISTENT",
	rawErrorLeak: "UNSAFE",
	duplicateHelper: "DUPLICATE",
	postgresMappingDrift: "INCONSISTENT",
	httpProjectionDrift: "INCONSISTENT",
	infrastructureGuessing: "INCONSISTENT",
	swallowedUnknownCatch: "UNSAFE",
	unsafeDetailsPassthrough: "UNSAFE",
	directAppErrorUiExposure: "UNSAFE",
	inconsistentErrorMapping: "INCONSISTENT",
	retryableMetadataDrift: "INCONSISTENT",
	operationalClassificationDrift: "INCONSISTENT",
	infrastructureClassificationDrift: "INCONSISTENT",
	review: "REVIEW",
};

const FINDING_GROUP_BY_CATEGORY = {
	manualResultConstruction: "manualResultConstruction",
	manualSerialization: "manualSerialization",
	canonicalSerializationDrift: "canonicalSerializationDrift",
	rawErrorLeak: "rawErrorLeaks",
	duplicateHelper: "duplicateHelpers",
	postgresMappingDrift: "postgresMappingDrift",
	httpProjectionDrift: "httpProjectionDrift",
	infrastructureGuessing: "infrastructureGuessing",
	swallowedUnknownCatch: "swallowedUnknownCatch",
	unsafeDetailsPassthrough: "unsafeDetailsPassthrough",
	directAppErrorUiExposure: "directAppErrorUiExposure",
	inconsistentErrorMapping: "inconsistentErrorMapping",
	retryableMetadataDrift: "retryableMetadataDrift",
	operationalClassificationDrift: "operationalClassificationDrift",
	infrastructureClassificationDrift: "infrastructureClassificationDrift",
	review: "review",
};

function normalizedRelative(root, pathname) {
	return relative(root, pathname).replace(/\\/g, "/");
}

function isSourceFile(name) {
	const index = name.lastIndexOf(".");
	return index >= 0 && SOURCE_EXTENSIONS.has(name.slice(index));
}

function shouldSkipSource(relativePath) {
	if (relativePath === "packages/foundation/errors/src/core/normalize.ts") {
		return false;
	}
	if (TEST_FILE_PATTERN.test(relativePath)) {
		return true;
	}
	const normalized = `/${relativePath}`;
	return EXCLUDED_PATH_PARTS.some((part) => normalized.includes(part));
}

function isRuntimeBoundaryPath(relativePath) {
	return (
		(relativePath.startsWith("apps/") ||
			relativePath.startsWith("packages/")) &&
		!relativePath.includes("/scripts/")
	);
}

function walkSource(directory, root, files = []) {
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
			walkSource(fullPath, root, files);
			continue;
		}

		const relativePath = normalizedRelative(root, fullPath);
		if (
			stats.isFile() &&
			isSourceFile(name) &&
			!shouldSkipSource(relativePath)
		) {
			files.push({ absolutePath: fullPath, relativePath });
		}
	}

	return files;
}

function addFinding(findings, category, file, message) {
	findings.push({
		category,
		auditCategory: CATEGORY_LABELS[category],
		file,
		message,
	});
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This audit intentionally applies its independent normalization rules in one linear catalog.
function analyzeSource({ relativePath, content }) {
	const findings = [];
	const isRuntimeBoundary = isRuntimeBoundaryPath(relativePath);
	const importsErrors = ERROR_IMPORT_PATTERN.test(content);
	const importsPostgres = POSTGRES_IMPORT_PATTERN.test(content);
	const importsResult = RESULT_IMPORT_PATTERN.test(content);
	const importsHttp = HTTP_IMPORT_PATTERN.test(content);
	const hasRawErrorLeak =
		isRuntimeBoundary && RAW_ERROR_LEAK_PATTERN.test(content);
	const hasManualSerialization =
		isRuntimeBoundary &&
		(MANUAL_SERIALIZATION_PATTERN.test(content) ||
			UNSAFE_PUBLIC_INTERNALS_PATTERN.test(content));
	const hasHttpProjectionDrift =
		MANUAL_HTTP_ERROR_STATUS_PATTERN.test(content) ||
		(HTTP_ERROR_BODY_PROJECTION_PATTERN.test(content) &&
			HARDCODED_ERROR_STATUS_PATTERN.test(content));
	const hasSwallowedUnknownCatch =
		isRuntimeBoundary && UNKNOWN_CATCH_SWALLOW_PATTERN.test(content);
	const hasCanonicalEvidence =
		NORMALIZER_PATTERN.test(content) ||
		POSTGRES_MAPPING_PATTERN.test(content) ||
		SERIALIZER_PATTERN.test(content) ||
		HTTP_PROJECTION_PATTERN.test(content) ||
		RESULT_HELPER_PATTERN.test(content) ||
		APP_ERROR_FACTORY_PATTERN.test(content) ||
		TYPE_CONTRACT_PATTERN.test(content);

	if (
		relativePath === "packages/foundation/errors/src/core/normalize.ts" &&
		INFRASTRUCTURE_GUESSING_PATTERN.test(content)
	) {
		addFinding(
			findings,
			"infrastructureGuessing",
			relativePath,
			"normalizeUnknown must stay infrastructure-agnostic; use explicit adapter mapping at infrastructure boundaries",
		);
	}

	if (
		!(
			importsErrors ||
			importsPostgres ||
			importsResult ||
			importsHttp ||
			hasRawErrorLeak ||
			hasManualSerialization ||
			hasHttpProjectionDrift ||
			hasSwallowedUnknownCatch
		) &&
		findings.length === 0
	) {
		return {
			file: relativePath,
			status: "not-applicable",
			findings,
			hasCanonicalEvidence: false,
		};
	}

	if (isRuntimeBoundary && MANUAL_RESULT_CONSTRUCTION_PATTERN.test(content)) {
		addFinding(
			findings,
			"manualResultConstruction",
			relativePath,
			"manual shared failure object construction; use fail/failFromAppError/failFromUnknown",
		);
	}

	if (isRuntimeBoundary && MANUAL_APP_ERROR_COPY_PATTERN.test(content)) {
		addFinding(
			findings,
			"manualResultConstruction",
			relativePath,
			"manual AppError-to-Result copy; use failFromAppError(mapped)",
		);
	}

	if (hasManualSerialization) {
		addFinding(
			findings,
			"manualSerialization",
			relativePath,
			"manual error serialization; use serializeAppError or httpErrorBody",
		);
	}

	if (
		isRuntimeBoundary &&
		CANONICAL_SERIALIZATION_DRIFT_PATTERN.test(content)
	) {
		addFinding(
			findings,
			"canonicalSerializationDrift",
			relativePath,
			"manual AppError field projection; use serializeAppError or a helper that delegates directly to it",
		);
	}

	if (
		hasRawErrorLeak &&
		!NORMALIZER_PATTERN.test(content) &&
		!importsPostgres
	) {
		addFinding(
			findings,
			"rawErrorLeak",
			relativePath,
			"raw unknown error message/string projection without normalization",
		);
	}

	if (
		isRuntimeBoundary &&
		DUPLICATE_HELPER_NAME_PATTERN.test(content) &&
		!hasCanonicalEvidence
	) {
		addFinding(
			findings,
			"duplicateHelper",
			relativePath,
			"package-local error helper does not delegate to @afenda/errors",
		);
	}

	if (
		isRuntimeBoundary &&
		importsPostgres &&
		(POSTGRES_TERNARY_DRIFT_PATTERN.test(content) ||
			MANUAL_APP_ERROR_COPY_PATTERN.test(content))
	) {
		addFinding(
			findings,
			"postgresMappingDrift",
			relativePath,
			"PostgreSQL mapper must return mapped ? failFromAppError(mapped) : failFromUnknown(...)",
		);
	}

	if (
		(LOCAL_HTTP_STATUS_MAP_PATTERN.test(content) ||
			LOCAL_RETRY_AFTER_READER_PATTERN.test(content)) &&
		!importsHttp
	) {
		addFinding(
			findings,
			"httpProjectionDrift",
			relativePath,
			"HTTP error projection must derive from @afenda/errors/http",
		);
	}

	if (hasHttpProjectionDrift) {
		addFinding(
			findings,
			"httpProjectionDrift",
			relativePath,
			"HTTP error responses must derive status from ERROR_HTTP_STATUS",
		);
	}

	if (hasSwallowedUnknownCatch) {
		addFinding(
			findings,
			"swallowedUnknownCatch",
			relativePath,
			"unknown catch returns a silent fallback; normalize or map the failure explicitly",
		);
	}

	if (isRuntimeBoundary && UNSAFE_DETAILS_PASSTHROUGH_PATTERN.test(content)) {
		addFinding(
			findings,
			"unsafeDetailsPassthrough",
			relativePath,
			"raw error object is passed through details; sanitize or map stable details only",
		);
	}

	if (
		relativePath.endsWith(".tsx") &&
		DIRECT_APP_ERROR_UI_PATTERN.test(content)
	) {
		addFinding(
			findings,
			"directAppErrorUiExposure",
			relativePath,
			"UI components must receive serialized/display-ready error state, not AppError instances",
		);
	}

	if (isRuntimeBoundary && INCONSISTENT_ERROR_MAPPING_PATTERN.test(content)) {
		addFinding(
			findings,
			"inconsistentErrorMapping",
			relativePath,
			"error code/message pairing looks inconsistent; use NOT_FOUND, CONFLICT, VALIDATION_ERROR, or INTERNAL_ERROR according to failure semantics",
		);
	}

	if (isRuntimeBoundary && RETRYABLE_WITHOUT_METADATA_PATTERN.test(content)) {
		addFinding(
			findings,
			"retryableMetadataDrift",
			relativePath,
			"retryable failure must preserve retryable metadata in safe details",
		);
	}

	if (isRuntimeBoundary && INTERNAL_ERROR_OPERATIONAL_PATTERN.test(content)) {
		addFinding(
			findings,
			"operationalClassificationDrift",
			relativePath,
			"internal defects must not be marked operational",
		);
	}

	if (isRuntimeBoundary && INFRA_CONFIG_CALLER_ERROR_PATTERN.test(content)) {
		addFinding(
			findings,
			"infrastructureClassificationDrift",
			relativePath,
			"infrastructure configuration failures must not be classified as caller errors",
		);
	}

	if (findings.length === 0 && !hasCanonicalEvidence) {
		addFinding(
			findings,
			"review",
			relativePath,
			"imports @afenda/errors but no canonical normalization evidence was detected",
		);
	}

	return {
		file: relativePath,
		status: findings.length === 0 ? "canonical" : "partial",
		findings,
		hasCanonicalEvidence,
	};
}

function collectReports(root) {
	return AUDIT_ROOTS.flatMap((auditRoot) =>
		walkSource(join(root, auditRoot), root),
	)
		.map(({ absolutePath, relativePath }) =>
			analyzeSource({
				relativePath,
				content: readFileSync(absolutePath, "utf8"),
			}),
		)
		.filter((report) => report.status !== "not-applicable")
		.sort((left, right) => left.file.localeCompare(right.file));
}

function groupFindings(reports) {
	const grouped = {
		manualResultConstruction: [],
		manualSerialization: [],
		canonicalSerializationDrift: [],
		rawErrorLeaks: [],
		duplicateHelpers: [],
		postgresMappingDrift: [],
		httpProjectionDrift: [],
		infrastructureGuessing: [],
		swallowedUnknownCatch: [],
		unsafeDetailsPassthrough: [],
		directAppErrorUiExposure: [],
		inconsistentErrorMapping: [],
		retryableMetadataDrift: [],
		operationalClassificationDrift: [],
		infrastructureClassificationDrift: [],
		review: [],
	};

	for (const report of reports) {
		for (const finding of report.findings) {
			const groupKey = FINDING_GROUP_BY_CATEGORY[finding.category];
			grouped[groupKey].push(finding);
		}
	}

	return grouped;
}

export function buildErrorsNormalizationReport({
	root = DEFAULT_ROOT,
	strict = false,
} = {}) {
	const files = collectReports(root);
	const grouped = groupFindings(files);
	const canonical = files.filter((report) => report.status === "canonical");
	const partial = files.filter((report) => report.status === "partial");
	const unsafeCount =
		grouped.manualResultConstruction.length +
		grouped.manualSerialization.length +
		grouped.canonicalSerializationDrift.length +
		grouped.rawErrorLeaks.length +
		grouped.duplicateHelpers.length +
		grouped.postgresMappingDrift.length +
		grouped.httpProjectionDrift.length +
		grouped.infrastructureGuessing.length +
		grouped.swallowedUnknownCatch.length +
		grouped.unsafeDetailsPassthrough.length +
		grouped.directAppErrorUiExposure.length +
		grouped.inconsistentErrorMapping.length +
		grouped.retryableMetadataDrift.length +
		grouped.operationalClassificationDrift.length +
		grouped.infrastructureClassificationDrift.length;
	const strictFailure = strict && grouped.review.length > 0;
	const status = unsafeCount > 0 || strictFailure ? "fail" : "ok";

	return {
		summary: {
			strict,
			status,
			files: files.length,
			canonical: canonical.length,
			partial: partial.length,
			manualResultConstruction: grouped.manualResultConstruction.length,
			manualSerialization: grouped.manualSerialization.length,
			canonicalSerializationDrift: grouped.canonicalSerializationDrift.length,
			rawErrorLeaks: grouped.rawErrorLeaks.length,
			duplicateHelpers: grouped.duplicateHelpers.length,
			postgresMappingDrift: grouped.postgresMappingDrift.length,
			httpProjectionDrift: grouped.httpProjectionDrift.length,
			infrastructureGuessing: grouped.infrastructureGuessing.length,
			swallowedUnknownCatch: grouped.swallowedUnknownCatch.length,
			unsafeDetailsPassthrough: grouped.unsafeDetailsPassthrough.length,
			directAppErrorUiExposure: grouped.directAppErrorUiExposure.length,
			inconsistentErrorMapping: grouped.inconsistentErrorMapping.length,
			retryableMetadataDrift: grouped.retryableMetadataDrift.length,
			operationalClassificationDrift:
				grouped.operationalClassificationDrift.length,
			infrastructureClassificationDrift:
				grouped.infrastructureClassificationDrift.length,
			review: grouped.review.length,
			strictFailure,
		},
		canonical,
		partial,
		...grouped,
	};
}

function appendFindings(lines, title, findings) {
	lines.push("");
	lines.push(`${title} (${findings.length})`);
	if (findings.length === 0) {
		lines.push("- none");
		return;
	}
	for (const finding of findings) {
		lines.push(
			`- ${finding.auditCategory} ${finding.file}: ${finding.message}`,
		);
	}
}

export function formatHumanReport(report) {
	const lines = ["check-errors-normalization: repository report"];
	lines.push(
		`summary canonical=${report.summary.canonical} partial=${report.summary.partial} strict=${report.summary.strict}`,
	);
	appendFindings(
		lines,
		"INCONSISTENT manual-result-construction",
		report.manualResultConstruction,
	);
	appendFindings(
		lines,
		"UNSAFE manual-serialization",
		report.manualSerialization,
	);
	appendFindings(
		lines,
		"INCONSISTENT canonical-serialization-drift",
		report.canonicalSerializationDrift,
	);
	appendFindings(lines, "UNSAFE raw-error-leak", report.rawErrorLeaks);
	appendFindings(lines, "DUPLICATE duplicate-helper", report.duplicateHelpers);
	appendFindings(
		lines,
		"INCONSISTENT postgres-mapping-drift",
		report.postgresMappingDrift,
	);
	appendFindings(
		lines,
		"INCONSISTENT http-projection-drift",
		report.httpProjectionDrift,
	);
	appendFindings(
		lines,
		"INCONSISTENT infrastructure-guessing",
		report.infrastructureGuessing,
	);
	appendFindings(
		lines,
		"UNSAFE swallowed-unknown-catch",
		report.swallowedUnknownCatch,
	);
	appendFindings(
		lines,
		"UNSAFE unsafe-details-passthrough",
		report.unsafeDetailsPassthrough,
	);
	appendFindings(
		lines,
		"UNSAFE direct-app-error-ui-exposure",
		report.directAppErrorUiExposure,
	);
	appendFindings(
		lines,
		"INCONSISTENT error-mapping",
		report.inconsistentErrorMapping,
	);
	appendFindings(
		lines,
		"INCONSISTENT retryable-metadata",
		report.retryableMetadataDrift,
	);
	appendFindings(
		lines,
		"INCONSISTENT operational-classification",
		report.operationalClassificationDrift,
	);
	appendFindings(
		lines,
		"INCONSISTENT infrastructure-classification",
		report.infrastructureClassificationDrift,
	);
	appendFindings(lines, "REVIEW", report.review);
	lines.push(
		report.summary.status === "ok"
			? "check-errors-normalization: ok"
			: "check-errors-normalization: FAIL",
	);
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
	const report = buildErrorsNormalizationReport({ root, strict });

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
