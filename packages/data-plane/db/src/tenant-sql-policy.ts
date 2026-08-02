import { HARD_TENANT_ROOT_TABLE_NAMES } from "./hard-tenant-roots";

const HARD_TENANT_ROOT_NAME_SET = new Set<string>(HARD_TENANT_ROOT_TABLE_NAMES);
const HARD_TENANT_ROOT_MENTION_PATTERN = new RegExp(
	`\\b(?:${HARD_TENANT_ROOT_TABLE_NAMES.map((name) =>
		name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
	).join("|")})\\b`,
	"g",
);
const INSERT_COLUMN_LIST_PATTERN = /^\s*\(([^)]*)\)/;
const ORGANIZATION_COLUMN_PATTERN = /\borganization_id\b/;
const QUALIFIED_ORGANIZATION_PATTERN =
	/\b([a-z_][a-z0-9_$]*)\s*\.\s*organization_id\b/g;
const TABLE_REFERENCE_PATTERN =
	/\b(delete\s+from|insert\s+into|merge\s+into|truncate(?:\s+table)?|update|from|join|using)\s+((?:[a-z_][a-z0-9_$]*\.)?[a-z_][a-z0-9_$]*)(?:\s+(?:as\s+)?([a-z_][a-z0-9_$]*))?/g;
const PREDICATE_CLAUSE_PATTERN =
	/\b(?:where|on)\b([\s\S]*?)(?=\b(?:where|on|returning|group\s+by|order\s+by|limit|offset|union|join|left|right|inner|full|cross)\b|;|$)/g;
const UPSERT_UPDATE_PATTERN =
	/\bon\s+conflict\s*(?:\(([^)]*)\))?\s+do\s+update\b/;
const DOLLAR_QUOTE_DELIMITER_PATTERN = /^\$(?:[a-zA-Z_][a-zA-Z0-9_]*)?\$/;

const SQL_ALIAS_STOP_WORDS = new Set([
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

interface HardTenantReference {
	readonly alias: string;
	readonly keyword: string;
	readonly matchEnd: number;
	readonly tableName: string;
}

function skipSingleQuotedLiteral(statement: string, start: number): number {
	let index = start + 1;
	while (index < statement.length) {
		if (statement[index] === "\\") {
			index += 2;
			continue;
		}
		if (statement[index] !== "'") {
			index += 1;
			continue;
		}
		if (statement[index + 1] === "'") {
			index += 2;
			continue;
		}
		return index + 1;
	}
	return statement.length;
}

function skipNestedBlockComment(statement: string, start: number): number {
	let depth = 1;
	let index = start + 2;
	while (index < statement.length && depth > 0) {
		const pair = statement.slice(index, index + 2);
		if (pair === "/*") {
			depth += 1;
			index += 2;
			continue;
		}
		if (pair === "*/") {
			depth -= 1;
			index += 2;
			continue;
		}
		index += 1;
	}
	return index;
}

function readDollarQuoteDelimiter(
	statement: string,
	start: number,
): string | undefined {
	return statement.slice(start).match(DOLLAR_QUOTE_DELIMITER_PATTERN)?.[0];
}

function appendQuotedIdentifier(
	output: string[],
	statement: string,
	start: number,
): number {
	let index = start + 1;
	while (index < statement.length) {
		if (statement[index] !== '"') {
			output.push(statement[index] ?? "");
			index += 1;
			continue;
		}
		if (statement[index + 1] === '"') {
			output.push('"');
			index += 2;
			continue;
		}
		return index + 1;
	}
	return statement.length;
}

function consumeQuotedOrComment(
	output: string[],
	statement: string,
	index: number,
): number | undefined {
	const character = statement[index];
	const pair = statement.slice(index, index + 2);
	if (character === "'") {
		output.push("''");
		return skipSingleQuotedLiteral(statement, index);
	}
	if (character === '"') {
		return appendQuotedIdentifier(output, statement, index);
	}
	if (character === "$") {
		const delimiter = readDollarQuoteDelimiter(statement, index);
		if (delimiter !== undefined) {
			const closingIndex = statement.indexOf(
				delimiter,
				index + delimiter.length,
			);
			output.push("''");
			return closingIndex < 0
				? statement.length
				: closingIndex + delimiter.length;
		}
	}
	if (pair === "--") {
		const lineEnd = statement.indexOf("\n", index + 2);
		output.push(" ");
		return lineEnd < 0 ? statement.length : lineEnd;
	}
	if (pair === "/*") {
		output.push(" ");
		return skipNestedBlockComment(statement, index);
	}
}

/** Internal normalized projection shared by tenant and approved system policies. */
export function normalizeSqlForPolicy(statement: string): string {
	const output: string[] = [];
	let index = 0;
	while (index < statement.length) {
		const nextIndex = consumeQuotedOrComment(output, statement, index);
		if (nextIndex !== undefined) {
			index = nextIndex;
			continue;
		}
		const character = statement[index];
		output.push(character ?? "");
		index += 1;
	}
	return output.join("").toLowerCase();
}

function findHardTenantReferences(statement: string): HardTenantReference[] {
	const references: HardTenantReference[] = [];

	for (const match of statement.matchAll(TABLE_REFERENCE_PATTERN)) {
		const [, keyword = "", qualifiedTableName, candidateAlias] = match;
		if (qualifiedTableName === undefined || match.index === undefined) {
			continue;
		}
		const tableName = qualifiedTableName.split(".").at(-1);
		if (tableName === undefined || !HARD_TENANT_ROOT_NAME_SET.has(tableName)) {
			continue;
		}

		const alias =
			candidateAlias !== undefined && !SQL_ALIAS_STOP_WORDS.has(candidateAlias)
				? candidateAlias
				: tableName;
		references.push({
			alias,
			keyword,
			matchEnd: match.index + match[0].length,
			tableName,
		});
	}

	return references;
}

function hasInsertOwnershipColumn(
	statement: string,
	reference: HardTenantReference,
): boolean {
	const remainder = statement.slice(reference.matchEnd);
	const columnList = remainder.match(INSERT_COLUMN_LIST_PATTERN)?.[1];
	return (
		columnList
			?.split(",")
			.some((columnName) => columnName.trim() === "organization_id") ?? false
	);
}

function hasTenantSafeConflictTarget(statement: string): boolean {
	const upsert = statement.match(UPSERT_UPDATE_PATTERN);
	if (upsert === null) {
		return true;
	}
	return (
		upsert[1]
			?.split(",")
			.some((columnName) => columnName.trim() === "organization_id") ?? false
	);
}

function collectPredicateOwnership(statement: string): {
	readonly aliases: ReadonlySet<string>;
	readonly hasUnqualifiedOwnership: boolean;
} {
	const aliases = new Set<string>();
	let hasUnqualifiedOwnership = false;
	for (const match of statement.matchAll(PREDICATE_CLAUSE_PATTERN)) {
		const predicate = match[1] ?? "";
		hasUnqualifiedOwnership ||= ORGANIZATION_COLUMN_PATTERN.test(predicate);
		for (const [, alias] of predicate.matchAll(
			QUALIFIED_ORGANIZATION_PATTERN,
		)) {
			if (alias !== undefined) {
				aliases.add(alias);
			}
		}
	}
	return { aliases, hasUnqualifiedOwnership };
}

/**
 * Fail-closed runtime policy for SQL reaching a hard-tenant root.
 *
 * Inserts must stamp `organization_id`. Reads and mutations must constrain
 * every hard-root alias in a WHERE/ON predicate. The AST-based repository
 * checker remains the complementary source-level control.
 */
export function assertTenantSqlSafety(rawStatement: string): void {
	const statement = normalizeSqlForPolicy(rawStatement);
	const mentionedTables = new Set(
		statement.match(HARD_TENANT_ROOT_MENTION_PATTERN),
	);
	if (mentionedTables.size === 0) {
		return;
	}
	if (statement.split(";").filter((part) => part.trim() !== "").length > 1) {
		throw new Error(
			`Tenant SQL policy rejected unowned access to: ${[...mentionedTables].sort().join(", ")}`,
		);
	}

	const references = findHardTenantReferences(statement);
	const rejectedTables = new Set<string>();
	const referencedTableNames = new Set(
		references.map((reference) => reference.tableName),
	);
	for (const tableName of mentionedTables) {
		if (!referencedTableNames.has(tableName)) {
			rejectedTables.add(tableName);
		}
	}

	const nonInsertReferences = references.filter((reference) => {
		if (reference.keyword !== "insert into") {
			return true;
		}
		if (
			!(
				hasInsertOwnershipColumn(statement, reference) &&
				hasTenantSafeConflictTarget(statement)
			)
		) {
			rejectedTables.add(reference.tableName);
		}
		return false;
	});

	const predicateOwnership = collectPredicateOwnership(statement);
	for (const reference of nonInsertReferences) {
		const soleReferenceHasUnqualifiedOwnership =
			nonInsertReferences.length === 1 &&
			predicateOwnership.hasUnqualifiedOwnership;
		if (
			!(
				predicateOwnership.aliases.has(reference.alias) ||
				soleReferenceHasUnqualifiedOwnership
			)
		) {
			rejectedTables.add(reference.tableName);
		}
	}

	if (rejectedTables.size > 0) {
		throw new Error(
			`Tenant SQL policy rejected unowned access to: ${[...rejectedTables].sort().join(", ")}`,
		);
	}
}
