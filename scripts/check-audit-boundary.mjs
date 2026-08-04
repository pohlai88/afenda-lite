import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import ts from "typescript";

const root = process.cwd();
const auditPackage = "packages/data-plane/audit";
const auditRoots = ["apps", "packages", "scripts", "testing"];
const skippedDirectories = new Set([
	"node_modules",
	".git",
	".next",
	".turbo",
	"dist",
	"build",
	"coverage",
]);
const sourceExtensions = new Set([
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".mjs",
]);
const testPathPattern = /(?:\/__tests__\/|\.(?:test|spec)\.[cm]?[jt]sx?$)/u;
const SQL_AUDIT_INSERT_PATTERN = /INSERT\s+INTO\s+platform_audit_log/iu;
const DRIZZLE_AUDIT_INSERT_PATTERN = /\.insert\(\s*platformAuditLog\s*\)/u;
const AUDIT_TRANSACTION_CAPABILITY_PATTERN =
	/afendaAudit\.transaction\.(?:prepare|prepareDerived|buildInsert)/u;
/** Relative import specifiers, for one-hop capability resolution. */
const RELATIVE_IMPORT_PATTERN = /from\s+["'](\.[^"']*)["']/gu;
/** Extension candidates when resolving an extensionless specifier. */
const MODULE_RESOLUTION_SUFFIXES = [
	"",
	".ts",
	".tsx",
	".mts",
	".cts",
	"/index.ts",
];
const violations = [];

function normalized(pathname) {
	return relative(root, pathname).replaceAll("\\", "/");
}

function extension(name) {
	const index = name.lastIndexOf(".");
	return index < 0 ? "" : name.slice(index);
}

function checkNamedAuditImports(rel, clause, bindings) {
	for (const element of bindings.elements) {
		const imported = element.propertyName?.text ?? element.name.text;
		const typeOnly = clause?.isTypeOnly === true || element.isTypeOnly;
		if (!(typeOnly || imported === "audit")) {
			violations.push(
				`${rel}: named runtime @afenda/audit import is forbidden: ${imported}`,
			);
		}
	}
}

function checkAuditImportDeclaration(rel, statement) {
	if (
		!(
			ts.isImportDeclaration(statement) &&
			ts.isStringLiteral(statement.moduleSpecifier)
		)
	) {
		return;
	}
	const specifier = statement.moduleSpecifier.text;
	if (specifier.startsWith("@afenda/audit/")) {
		violations.push(`${rel}: unpublished @afenda/audit subpath import`);
		return;
	}
	if (specifier !== "@afenda/audit") {
		return;
	}
	const clause = statement.importClause;
	if (clause?.name !== undefined) {
		violations.push(`${rel}: default @afenda/audit import is forbidden`);
	}
	const bindings = clause?.namedBindings;
	if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
		violations.push(`${rel}: namespace @afenda/audit import is forbidden`);
		return;
	}
	if (bindings !== undefined && ts.isNamedImports(bindings)) {
		checkNamedAuditImports(rel, clause, bindings);
	}
}

function checkAuditImports(rel, content) {
	const source = ts.createSourceFile(
		rel,
		content,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	for (const statement of source.statements) {
		checkAuditImportDeclaration(rel, statement);
	}
}

function checkFile(pathname) {
	const rel = normalized(pathname);
	if (rel === "scripts/check-audit-boundary.test.mjs") {
		return;
	}
	const content = readFileSync(pathname, "utf8");
	const isAuditPackage = rel.startsWith(`${auditPackage}/`);
	if (!isAuditPackage) {
		checkAuditImports(rel, content);
	}
	if (isAuditPackage || testPathPattern.test(rel)) {
		return;
	}

	const writesAuditTable =
		SQL_AUDIT_INSERT_PATTERN.test(content) ||
		DRIZZLE_AUDIT_INSERT_PATTERN.test(content);
	if (
		writesAuditTable &&
		!AUDIT_TRANSACTION_CAPABILITY_PATTERN.test(content) &&
		!usesCapabilityThroughRelativeImport(pathname, content)
	) {
		violations.push(
			`${rel}: audit-table write bypasses the canonical transaction capability`,
		);
	}
}

/**
 * Does this file reach the capability through a module it imports?
 *
 * The rule is "the audit record is built by the canonical capability", not "the
 * literal call appears in the file that emits the SQL". Factoring audit-command
 * construction into one module per feature is better than inlining it at every
 * write site — it gives the module's audit shape a single owner. Matching only
 * on the emitting file inverted that: `human-resources/.../time.drizzle.ts`
 * builds its entry via `prepareTimeAudit()`, a wrapper that calls
 * `afendaAudit.transaction.prepare`, and was reported as a bypass while a peer
 * that inlined the same call passed. The gate rewarded duplication.
 *
 * One hop only, and deliberately so. The imported module is itself walked by
 * this gate, so a helper that fakes an audit record without the capability is
 * still caught where it writes. Following further would trade a bounded, cheap
 * check for a whole-program resolver.
 */
function usesCapabilityThroughRelativeImport(pathname, content) {
	const directory = dirname(pathname);
	for (const match of content.matchAll(RELATIVE_IMPORT_PATTERN)) {
		const resolved = resolveRelativeModule(directory, match[1]);
		if (resolved === undefined) {
			continue;
		}
		if (
			AUDIT_TRANSACTION_CAPABILITY_PATTERN.test(readFileSync(resolved, "utf8"))
		) {
			return true;
		}
	}
	return false;
}

/** First existing file for an extensionless relative specifier. */
function resolveRelativeModule(directory, specifier) {
	for (const suffix of MODULE_RESOLUTION_SUFFIXES) {
		const candidate = join(directory, `${specifier}${suffix}`);
		if (existsSync(candidate) && statSync(candidate).isFile()) {
			return candidate;
		}
	}
}

function walk(directory) {
	let entries;
	try {
		entries = readdirSync(directory);
	} catch {
		return;
	}
	for (const name of entries) {
		if (skippedDirectories.has(name)) {
			continue;
		}
		const pathname = join(directory, name);
		const stats = statSync(pathname);
		if (stats.isDirectory()) {
			walk(pathname);
		} else if (stats.isFile() && sourceExtensions.has(extension(name))) {
			checkFile(pathname);
		}
	}
}

for (const auditRoot of auditRoots) {
	walk(join(root, auditRoot));
}

const barrel = readFileSync(join(root, auditPackage, "src/index.ts"), "utf8");
if (
	!/export\s+\{\s*audit\s*\}\s+from\s+["']\.\/capabilities\/audit["']/u.test(
		barrel,
	)
) {
	violations.push(
		`${auditPackage}/src/index.ts: missing permanent audit facade export`,
	);
}

if (violations.length > 0) {
	console.error("check-audit-boundary: FAIL");
	for (const violation of violations.toSorted()) {
		console.error(`  - ${violation}`);
	}
	process.exit(1);
}

console.log("check-audit-boundary: ok");
