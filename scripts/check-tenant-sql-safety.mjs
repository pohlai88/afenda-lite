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
import { parseHardTenantRootEntries } from "./lib/hard-tenant-root-registry.mjs";

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
const SYSTEM_SQL_POLICY_PATH =
	"packages/data-plane/db/src/system-sql-policy.ts";

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
	return new Set(
		parseHardTenantRootEntries(source).map((entry) => entry.tableIdentifier),
	);
}

export function loadSystemSqlOperationOwners(source) {
	const sourceFile = ts.createSourceFile(
		SYSTEM_SQL_POLICY_PATH,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const operations = new Map();
	function visit(node) {
		if (
			ts.isPropertyAssignment(node) &&
			(ts.isStringLiteral(node.name) || ts.isIdentifier(node.name)) &&
			ts.isObjectLiteralExpression(node.initializer)
		) {
			const owner = node.initializer.properties.find(
				(property) =>
					ts.isPropertyAssignment(property) &&
					property.name.getText(sourceFile) === "ownerSource" &&
					ts.isStringLiteral(property.initializer),
			);
			if (owner && ts.isPropertyAssignment(owner)) {
				operations.set(node.name.text, owner.initializer.text);
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return operations;
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

/**
 * Split a lowercased SQL statement into CTE bodies + the final statement.
 * Unqualified organization_id is then judged per scope, not globally, so
 * multi-CTE atomic writes stop failing when each CTE owns exactly one
 * hard-tenant table (gate defect documented in 5a48c35d).
 *
 * @param {string} statement
 * @returns {ReadonlyArray<{ start: number, end: number, text: string }>}
 */
export function extractSqlScopes(statement) {
	/** @type {Array<{ start: number, end: number, text: string }>} */
	const scopes = [];
	const withMatch = statement.match(/\bwith\b/);
	if (!withMatch || withMatch.index === undefined) {
		return [{ start: 0, end: statement.length, text: statement }];
	}

	let cursor = withMatch.index + withMatch[0].length;
	while (cursor < statement.length) {
		while (cursor < statement.length && /[\s,]/.test(statement[cursor] ?? "")) {
			cursor += 1;
		}
		const nameMatch = /[a-z_][a-z0-9_$]*/y;
		nameMatch.lastIndex = cursor;
		if (!nameMatch.test(statement)) {
			break;
		}
		cursor = nameMatch.lastIndex;
		const asMatch = /\s+as\s*\(/y;
		asMatch.lastIndex = cursor;
		if (!asMatch.test(statement)) {
			break;
		}
		const bodyStart = asMatch.lastIndex;
		let depth = 1;
		let bodyEnd = bodyStart;
		while (bodyEnd < statement.length && depth > 0) {
			const ch = statement[bodyEnd];
			if (ch === "(") {
				depth += 1;
			} else if (ch === ")") {
				depth -= 1;
			}
			bodyEnd += 1;
		}
		scopes.push({
			start: bodyStart,
			end: bodyEnd - 1,
			text: statement.slice(bodyStart, bodyEnd - 1),
		});
		cursor = bodyEnd;
		while (cursor < statement.length && /\s/.test(statement[cursor] ?? "")) {
			cursor += 1;
		}
		if (statement[cursor] === ",") {
			cursor += 1;
			continue;
		}
		break;
	}

	if (cursor < statement.length) {
		scopes.push({
			start: cursor,
			end: statement.length,
			text: statement.slice(cursor),
		});
	}

	if (scopes.length === 0) {
		return [{ start: 0, end: statement.length, text: statement }];
	}
	return scopes;
}

/**
 * @param {ReadonlyArray<{ start: number, end: number, text: string }>} scopes
 * @param {number} index
 */
function innermostScopeAt(scopes, index) {
	/** @type {{ start: number, end: number, text: string } | null} */
	let best = null;
	for (const scope of scopes) {
		if (index >= scope.start && index < scope.end) {
			if (!best || scope.end - scope.start < best.end - best.start) {
				best = scope;
			}
		}
	}
	return (
		best ??
		scopes.at(-1) ?? { start: 0, end: Number.POSITIVE_INFINITY, text: "" }
	);
}

function scopeHasUnqualifiedOrganizationId(scopeText) {
	return /\b(?:where|on|and|or)\b[\s\S]*\borganization_id\b/.test(scopeText);
}

function lineOf(sourceFile, node) {
	return (
		sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
	);
}

export function analyzeTenantSqlSafety({
	file = "fixture.ts",
	hardTenantTables,
	hardTenantTableNames = new Set(),
	source,
	systemSqlOperationOwners = new Map(),
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

	function analyzeInsert(node, table) {
		const chain = highestQueryChainNode(node);
		const valuesText = findCalls(chain, new Set(["values"]))
			.map((call) => resolvedArgumentText(call, sourceFile, declarations))
			.join("\n");
		if (!/\borganizationId\b/.test(valuesText)) {
			addFinding(
				node,
				"tenant-insert-missing-organization",
				table,
				"INSERT must stamp organizationId in the database values",
			);
		}
	}

	function rawTemplateText(node) {
		if (ts.isNoSubstitutionTemplateLiteral(node.template)) {
			return node.template.text;
		}
		return [
			node.template.head.text,
			...node.template.templateSpans.flatMap((span) => [
				" ? ",
				span.literal.text,
			]),
		].join("");
	}

	function enclosingSystemOperation(node) {
		let current = node.parent;
		while (current && current !== sourceFile) {
			if (
				ts.isCallExpression(current) &&
				ts.isPropertyAccessExpression(current.expression) &&
				current.expression.name.text === "transaction" &&
				ts.isPropertyAccessExpression(current.expression.expression) &&
				current.expression.expression.name.text === "system"
			) {
				const [operation] = current.arguments;
				return operation && ts.isStringLiteral(operation) ? operation.text : "";
			}
			current = current.parent;
		}
		return null;
	}

	function analyzeRawTemplate(node) {
		const statement = rawTemplateText(node).toLowerCase();
		const mentionedTables = [...hardTenantTableNames].filter((table) =>
			new RegExp(`\\b${table}\\b`).test(statement),
		);
		if (mentionedTables.length === 0) {
			return;
		}

		const systemOperation = enclosingSystemOperation(node);
		if (systemOperation !== null) {
			const ownerSource = systemSqlOperationOwners.get(systemOperation);
			if (ownerSource !== file) {
				addFinding(
					node,
					"system-sql-operation-owner-mismatch",
					systemOperation || "unknown",
					"Cross-organization SQL must use a registered operation from its declared owner source",
				);
			}
			return;
		}

		const aliasStopWords = new Set([
			"cross",
			"full",
			"group",
			"inner",
			"join",
			"left",
			"limit",
			"offset",
			"on",
			"order",
			"outer",
			"returning",
			"right",
			"set",
			"union",
			"values",
			"where",
		]);
		const references = [];
		for (const table of mentionedTables) {
			const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const insert = statement.match(
				new RegExp(`\\binsert\\s+into\\s+${escapedTable}\\s*\\(([^)]*)\\)`),
			);
			if (insert && !/\borganization_id\b/.test(insert[1] ?? "")) {
				addFinding(
					node,
					"raw-tenant-insert-missing-organization",
					table,
					"Raw INSERT must stamp organization_id",
				);
			}

			const referencePattern = new RegExp(
				`\\b(?:from|join|using|update|delete\\s+from)\\s+${escapedTable}\\b(?:\\s+(?:as\\s+)?([a-z_][a-z0-9_$]*))?`,
				"g",
			);
			for (const reference of statement.matchAll(referencePattern)) {
				const [, candidateAlias] = reference;
				const alias =
					candidateAlias && !aliasStopWords.has(candidateAlias)
						? candidateAlias
						: table;
				references.push({
					alias,
					index: reference.index ?? 0,
					node,
					table,
				});
			}
		}

		const scopes = extractSqlScopes(statement);
		for (const reference of references) {
			const { alias, index, table } = reference;
			if (
				new RegExp(`\\b${alias}\\s*\\.\\s*organization_id\\b`).test(statement)
			) {
				continue;
			}
			const scope = innermostScopeAt(scopes, index);
			const refsInScope = references.filter(
				(entry) => entry.index >= scope.start && entry.index < scope.end,
			);
			if (
				refsInScope.length === 1 &&
				scopeHasUnqualifiedOrganizationId(scope.text)
			) {
				continue;
			}
			addFinding(
				node,
				"raw-tenant-sql-missing-organization",
				table,
				`Raw SQL reference ${alias} must carry an explicit organization_id predicate`,
			);
		}
	}

	function visit(node) {
		if (ts.isTaggedTemplateExpression(node)) {
			analyzeRawTemplate(node);
		}
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
		} else if (name === "insert") {
			analyzeInsert(node, table);
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
	const hardTenantRootEntries = parseHardTenantRootEntries(hardRootsSource);
	const hardTenantTables = new Set(
		hardTenantRootEntries.map((entry) => entry.tableIdentifier),
	);
	const hardTenantTableNames = new Set(
		hardTenantRootEntries.map((entry) => entry.sqlName),
	);
	const systemSqlOperationOwners = loadSystemSqlOperationOwners(
		readFileSync(join(cwd, SYSTEM_SQL_POLICY_PATH), "utf8"),
	);
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
				hardTenantTableNames,
				hardTenantTables,
				source: readFileSync(absoluteFile, "utf8"),
				systemSqlOperationOwners,
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
