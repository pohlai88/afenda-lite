/**
 * Additive-first migration SQL gate (N2).
 * Denies DROP TABLE, TRUNCATE, and DROP COLUMN unless
 * AFENDA_ALLOW_DESTRUCTIVE_MIGRATE=1.
 *
 * Narrow statement-level detection after stripping comments and string literals.
 * Does not ban DROP INDEX / DROP CONSTRAINT / CREATE INDEX by substring alone.
 */

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
			i += 2;
			while (i < sql.length && sql[i] !== "\n") {
				i += 1;
			}
			continue;
		}

		if (c === "/" && next === "*") {
			i += 2;
			while (i < sql.length - 1 && !(sql[i] === "*" && sql[i + 1] === "/")) {
				i += 1;
			}
			i = Math.min(i + 2, sql.length);
			continue;
		}

		if (c === "'") {
			out += " ";
			i += 1;
			while (i < sql.length) {
				if (sql[i] === "'" && sql[i + 1] === "'") {
					i += 2;
					continue;
				}
				if (sql[i] === "'") {
					i += 1;
					break;
				}
				i += 1;
			}
			continue;
		}

		if (c === "$") {
			const dollar = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
			if (dollar) {
				const tag = dollar[0];
				i += tag.length;
				const end = sql.indexOf(tag, i);
				if (end === -1) {
					out += " ";
					break;
				}
				out += " ";
				i = end + tag.length;
				continue;
			}
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
	const s = statement.replace(/\s+/g, " ").trim();
	const upper = s.toUpperCase();

	if (/^DROP\s+TABLE\b/.test(upper)) {
		return "DROP TABLE";
	}
	if (/^TRUNCATE\b/.test(upper)) {
		return "TRUNCATE";
	}
	// ALTER TABLE … DROP COLUMN — allow DROP CONSTRAINT / DROP INDEX elsewhere
	if (/^ALTER\s+TABLE\b/.test(upper) && /\bDROP\s+COLUMN\b/.test(upper)) {
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
