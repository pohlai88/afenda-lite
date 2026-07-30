/**
 * Additive-first migration SQL gate (N2).
 * Denies DROP TABLE, TRUNCATE, and DROP COLUMN unless
 * AFENDA_ALLOW_DESTRUCTIVE_MIGRATE=1.
 *
 * Narrow statement-level detection after stripping comments and string literals.
 * Does not ban DROP INDEX / DROP CONSTRAINT / CREATE INDEX by substring alone.
 */

const DOLLAR_QUOTE_TAG_PATTERN = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/;
const WHITESPACE_PATTERN = /\s+/g;
const DROP_TABLE_PATTERN = /^DROP\s+TABLE\b/;
const TRUNCATE_PATTERN = /^TRUNCATE\b/;
const ALTER_TABLE_PATTERN = /^ALTER\s+TABLE\b/;
const DROP_COLUMN_PATTERN = /\bDROP\s+COLUMN\b/;

function skipLineComment(sql, start) {
	let index = start + 2;
	while (index < sql.length && sql[index] !== "\n") {
		index += 1;
	}
	return index;
}

function skipBlockComment(sql, start) {
	let index = start + 2;
	while (
		index < sql.length - 1 &&
		!(sql[index] === "*" && sql[index + 1] === "/")
	) {
		index += 1;
	}
	return Math.min(index + 2, sql.length);
}

function skipSingleQuotedString(sql, start) {
	let index = start + 1;
	while (index < sql.length) {
		if (sql[index] === "'" && sql[index + 1] === "'") {
			index += 2;
			continue;
		}
		if (sql[index] === "'") {
			return index + 1;
		}
		index += 1;
	}
	return index;
}

function findDollarQuotedStringEnd(sql, start) {
	const match = DOLLAR_QUOTE_TAG_PATTERN.exec(sql.slice(start));
	if (!match) {
		return null;
	}
	const [tag] = match;
	const contentStart = start + tag.length;
	const closingTag = sql.indexOf(tag, contentStart);
	return closingTag === -1
		? { nextIndex: sql.length, unterminated: true }
		: { nextIndex: closingTag + tag.length, unterminated: false };
}

/**
 * Remove line comments, block comments, and string / dollar-quote literals.
 * @param {string} sql
 * @returns {string}
 */
export function stripSqlNoise(sql) {
	let out = "";
	let i = 0;
	while (i < sql.length) {
		const c = sql[i];
		const next = sql[i + 1];

		if (c === "-" && next === "-") {
			i = skipLineComment(sql, i);
			continue;
		}

		if (c === "/" && next === "*") {
			i = skipBlockComment(sql, i);
			continue;
		}

		if (c === "'") {
			out += " ";
			i = skipSingleQuotedString(sql, i);
			continue;
		}

		const dollarQuotedString =
			c === "$" ? findDollarQuotedStringEnd(sql, i) : null;
		if (dollarQuotedString !== null) {
			out += " ";
			i = dollarQuotedString.nextIndex;
			if (dollarQuotedString.unterminated) {
				break;
			}
			continue;
		}

		out += c;
		i += 1;
	}
	return out;
}

/**
 * @param {string} sql
 * @returns {string[]}
 */
export function splitSqlStatements(sql) {
	const cleaned = stripSqlNoise(sql);
	return cleaned
		.split(";")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/**
 * @param {string} statement normalized statement (comments/strings stripped)
 * @returns {string | null} reason if destructive
 */
export function detectDestructiveStatement(statement) {
	const s = statement.replace(WHITESPACE_PATTERN, " ").trim();
	const upper = s.toUpperCase();

	if (DROP_TABLE_PATTERN.test(upper)) {
		return "DROP TABLE";
	}
	if (TRUNCATE_PATTERN.test(upper)) {
		return "TRUNCATE";
	}
	// ALTER TABLE … DROP COLUMN — allow DROP CONSTRAINT / DROP INDEX elsewhere
	if (ALTER_TABLE_PATTERN.test(upper) && DROP_COLUMN_PATTERN.test(upper)) {
		return "DROP COLUMN";
	}
	return null;
}

/**
 * @param {string} sql
 * @returns {{ ok: boolean, findings: { statement: string, reason: string }[] }}
 */
export function assertAdditiveMigrationSql(sql) {
	const findings = [];
	for (const statement of splitSqlStatements(sql)) {
		const reason = detectDestructiveStatement(statement);
		if (reason) {
			findings.push({
				statement: statement.slice(0, 120),
				reason,
			});
		}
	}
	return { ok: findings.length === 0, findings };
}

/**
 * @param {string[]} sqlContents
 * @param {{ allowDestructive?: boolean }} [options]
 * @returns {{ ok: boolean, findings: { statement: string, reason: string }[] }}
 */
export function assertAdditiveMigrations(sqlContents, options = {}) {
	if (options.allowDestructive) {
		return { ok: true, findings: [] };
	}
	const findings = [];
	for (const sql of sqlContents) {
		const result = assertAdditiveMigrationSql(sql);
		findings.push(...result.findings);
	}
	return { ok: findings.length === 0, findings };
}
