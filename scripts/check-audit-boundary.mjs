import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
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
	if (writesAuditTable && !AUDIT_TRANSACTION_CAPABILITY_PATTERN.test(content)) {
		violations.push(
			`${rel}: audit-table write bypasses the canonical transaction capability`,
		);
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
