/**
 * Static governance for organization-owned Drizzle operations.
 *
 * The checker reads hard-tenant table identifiers from @afenda/db and requires
 * the final predicate-bearing query chain to scope every referenced tenant
 * table. UPDATE and DELETE additionally require a record-selection predicate
 * beyond organization ownership.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const ROOTS = ["apps/web", "packages"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIR_NAMES = new Set([
	"node_modules",
	".next",
	"dist",
	"coverage",
	".turbo",
	"__tests__",
	"testing",
]);
const HARD_ROOTS_PATH = "packages/data-plane/db/src/hard-tenant-roots.ts";
const HARD_ROOTS_OBJECT_PATTERN =
	/export const HARD_TENANT_ROOT_TABLES = \{([\s\S]*?)\n\s*\} as const;/;
const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;

function normalizePath(path) {
	return path.replaceAll("\\", "/");
}

function walk(dir, out) {
	let entries;
	try {
		entries = readdirSync(dir);
	} catch {
		return;
	}
	for (const name of entries) {
		if (SKIP_DIR_NAMES.has(name)) {
			continue;
		}
		const full = join(dir, name);
		let stats;
		try {
			stats = statSync(full);
		} catch {
			continue;
		}
		if (stats.isDirectory()) {
			walk(full, out);
			continue;
		}
		if (EXTENSIONS.has(extname(name))) {
			out.push(full);
		}
	}
}

export function loadHardTenantTableIdentifiers(source) {
	const body = source.match(HARD_ROOTS_OBJECT_PATTERN)?.[1];
	if (!body) {
		throw new Error("Could not read HARD_TENANT_ROOT_TABLES object");
	}
	return new Set(
		body
			.split(",")
			.map((entry) => entry.trim())
			.filter((entry) => IDENTIFIER_PATTERN.test(entry)),
	);
}

function propertyCallName(node) {
	if (
		!(
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression)
		)
	) {
		return null;
	}
	return node.expression.name.text;
}

function highestQueryChainNode(node) {
	let current = node;
	while (current.parent) {
		const { parent } = current;
		if (
			(ts.isPropertyAccessExpression(parent) &&
				parent.expression === current) ||
			(ts.isElementAccessExpression(parent) && parent.expression === current) ||
			(ts.isCallExpression(parent) && parent.expression === current) ||
			(ts.isAwaitExpression(parent) && parent.expression === current) ||
			ts.isParenthesizedExpression(parent)
		) {
			current = parent;
			continue;
		}
		break;
	}
	return current;
}

function findCalls(node, names) {
	const calls = [];
	function visit(candidate) {
		const name = propertyCallName(candidate);
		if (name && names.has(name)) {
			calls.push(candidate);
		}
		ts.forEachChild(candidate, visit);
	}
	visit(node);
	return calls;
}

function resolvedArgumentText(call, sourceFile, declarations, index = 0) {
	const argument = call.arguments[index];
	if (!argument) {
		return "";
	}
	const fragments = [argument.getText(sourceFile)];
	const visited = new Set();
	function nearestPrior(nodes, position) {
		const prior = nodes
			?.filter((node) => node.getStart(sourceFile) < position)
			.toSorted((a, b) => b.getStart(sourceFile) - a.getStart(sourceFile))[0];
		if (prior) {
			return prior;
		}
		return nodes?.find((node) => ts.isBlock(node));
	}
	function visit(candidate) {
		if (ts.isIdentifier(candidate)) {
			const declaration = nearestPrior(
				declarations.get(candidate.text),
				candidate.getStart(sourceFile),
			);
			const resolved =
				declaration && ts.isVariableDeclaration(declaration)
					? declaration.initializer
					: declaration;
			const key = resolved
				? `${candidate.text}:${resolved.getStart(sourceFile)}`
				: candidate.text;
			if (resolved && !visited.has(key)) {
				visited.add(key);
				fragments.push(resolved.getText(sourceFile));
				ts.forEachChild(resolved, visit);
			}
		}
		ts.forEachChild(candidate, visit);
	}
	visit(argument);
	return fragments.join("\n");
}

function tableColumnReferences(predicateText, tableIdentifier) {
	const escaped = tableIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return [
		...predicateText.matchAll(
			new RegExp(`\\b${escaped}\\s*\\.\\s*([A-Za-z_$][\\w$]*)`, "g"),
		),
	].map((match) => match[1]);
}

function lineOf(sourceFile, node) {
	return (
		sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
	);
}

export function analyzeTenantSqlSafety({
	file = "fixture.ts",
	hardTenantTables,
	source,
}) {
	const sourceFile = ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		true,
		file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const findings = [];
	const seen = new Set();
	const declarations = new Map();
	function addDeclaration(name, node) {
		const existing = declarations.get(name) ?? [];
		existing.push(node);
		declarations.set(name, existing);
	}
	function collectDeclarations(node) {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer
		) {
			addDeclaration(node.name.text, node);
		} else if (ts.isFunctionDeclaration(node) && node.name && node.body) {
			addDeclaration(node.name.text, node.body);
		}
		ts.forEachChild(node, collectDeclarations);
	}
	collectDeclarations(sourceFile);

	function addFinding(node, rule, table, detail) {
		const key = `${node.pos}:${rule}:${table}`;
		if (seen.has(key)) {
			return;
		}
		seen.add(key);
		findings.push({
			file,
			line: lineOf(sourceFile, node),
			rule,
			table,
			detail,
		});
	}

	function analyzeMutation(node, table) {
		const chain = highestQueryChainNode(node);
		const predicate = findCalls(chain, new Set(["where"]))
			.map((call) => resolvedArgumentText(call, sourceFile, declarations))
			.join("\n");
		const columns = tableColumnReferences(predicate, table);
		if (!columns.includes("organizationId")) {
			addFinding(
				node,
				"tenant-mutation-missing-organization",
				table,
				"UPDATE/DELETE must include the table organizationId in WHERE",
			);
			return;
		}
		if (!columns.some((column) => column !== "organizationId")) {
			addFinding(
				node,
				"tenant-mutation-missing-record-selection",
				table,
				"UPDATE/DELETE must prove record selection and organization ownership",
			);
		}
	}

	function analyzeRead(node, table) {
		const chain = highestQueryChainNode(node);
		const predicate = findCalls(
			chain,
			new Set(["where", "innerJoin", "leftJoin", "rightJoin", "fullJoin"]),
		)
			.map((call) =>
				propertyCallName(call) === "where"
					? resolvedArgumentText(call, sourceFile, declarations)
					: resolvedArgumentText(call, sourceFile, declarations, 1),
			)
			.join("\n");
		if (!tableColumnReferences(predicate, table).includes("organizationId")) {
			addFinding(
				node,
				"tenant-read-missing-organization",
				table,
				"Every organization-owned FROM/JOIN table must be scoped in SQL predicates",
			);
		}
	}

	function visit(node) {
		if (!ts.isCallExpression(node)) {
			ts.forEachChild(node, visit);
			return;
		}

		const name = propertyCallName(node);
		const [tableArgument] = node.arguments;
		if (!(name && tableArgument && ts.isIdentifier(tableArgument))) {
			ts.forEachChild(node, visit);
			return;
		}
		const table = tableArgument.text;
		if (!hardTenantTables.has(table)) {
			ts.forEachChild(node, visit);
			return;
		}

		if (name === "update" || name === "delete") {
			analyzeMutation(node, table);
		} else if (name === "from" || name.endsWith("Join")) {
			analyzeRead(node, table);
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return findings;
}

export function runTenantSqlSafetyCheck(cwd = process.cwd()) {
	const hardRootsSource = readFileSync(join(cwd, HARD_ROOTS_PATH), "utf8");
	const hardTenantTables = loadHardTenantTableIdentifiers(hardRootsSource);
	const files = [];
	for (const root of ROOTS) {
		walk(join(cwd, root), files);
	}

	const findings = [];
	for (const absoluteFile of files) {
		const file = normalizePath(relative(cwd, absoluteFile));
		if (
			file === HARD_ROOTS_PATH ||
			file === "packages/data-plane/db/src/client.ts" ||
			file.includes("/src/schema/")
		) {
			continue;
		}
		findings.push(
			...analyzeTenantSqlSafety({
				file,
				hardTenantTables,
				source: readFileSync(absoluteFile, "utf8"),
			}),
		);
	}
	return { filesScanned: files.length, findings };
}

const isMain =
	process.argv[1] !== undefined &&
	pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
	const result = runTenantSqlSafetyCheck();
	if (result.findings.length > 0) {
		console.error("check:tenant-sql-safety FAIL — unsafe tenant SQL found:");
		for (const finding of result.findings) {
			console.error(
				`  ${finding.file}:${finding.line} [${finding.rule}] ${finding.table}: ${finding.detail}`,
			);
		}
		process.exit(1);
	}
	console.log(
		`check:tenant-sql-safety PASS — scanned ${result.filesScanned} files; hard-tenant Drizzle operations carry explicit SQL predicates`,
	);
}
