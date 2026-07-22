/**
 * Operator tool: apply pending Drizzle SQL migrations when db:migrate guard blocks.
 * Usage:
 *   node ./scripts/apply-migrations.mjs --journal-only 0040_hr_compensation_benefits_ddl 0041_hr_learning_ddl
 *   node ./scripts/apply-migrations.mjs 0044_hr_performance_ddl 0045_hr_talent_ddl
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.join(root, "../../..");
const drizzleDir = path.join(root, "drizzle");
const journalPath = path.join(drizzleDir, "meta/_journal.json");

function loadEnvLocal() {
	if (process.env.DATABASE_URL) return;
	const envPath = path.join(repoRoot, ".env.local");
	if (!fs.existsSync(envPath)) return;
	for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
		if (!match || process.env[match[1]] !== undefined) continue;
		let value = match[2]?.trim() ?? "";
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		process.env[match[1]] = value;
	}
}

function loadJournal() {
	const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
	return new Map(journal.entries.map((entry) => [entry.tag, entry]));
}

function splitStatements(content) {
	return content
		.split(/--> statement-breakpoint\n/)
		.map((statement) => statement.trim())
		.filter(Boolean);
}

function tableExistsProbe(sql, tableName) {
	return sql`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = ${tableName}
	`;
}

function probeTableForMigration(tag) {
	if (tag === "0040_hr_compensation_benefits_ddl") return "hr_benefit_enrollment";
	if (tag === "0041_hr_learning_ddl") return "hr_learning_course";
	if (tag === "0042_hr_learning_idempotency_columns") return "hr_learning_course";
	if (tag === "0043_hr_leave_ddl") return "hr_leave_policy";
	if (tag === "0044_hr_performance_ddl") return "hr_performance_cycle";
	if (tag === "0045_hr_talent_ddl") return "hr_competency";
	if (tag === "0046_hr_workforce_planning_ddl") return "hr_headcount_plan";
	if (tag === "0047_hr_employee_relations_ddl") return "hr_employee_case";
	if (tag === "0048_hr_compliance_ddl") return "hr_document_requirement";
	return null;
}

loadEnvLocal();

const args = process.argv.slice(2);
const journalOnly = args[0] === "--journal-only";
const tags = journalOnly ? args.slice(1) : args;

if (tags.length === 0) {
	console.error(
		"Usage: node ./scripts/apply-migrations.mjs [--journal-only] <tag> [tag...]",
	);
	process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error("apply-migrations: DATABASE_URL missing");
	process.exit(1);
}

const journalByTag = loadJournal();
const sql = neon(databaseUrl);

for (const tag of tags) {
	const entry = journalByTag.get(tag);
	if (!entry) {
		console.error(`apply-migrations: unknown journal tag ${tag}`);
		process.exit(1);
	}

	const filePath = path.join(drizzleDir, `${tag}.sql`);
	if (!fs.existsSync(filePath)) {
		console.error(`apply-migrations: missing file ${filePath}`);
		process.exit(1);
	}

	const content = fs.readFileSync(filePath, "utf8");
	const hash = crypto.createHash("sha256").update(content).digest("hex");
	const createdAt = String(entry.when);

	const existingHash = await sql`
		SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${hash}
	`;
	if (existingHash.length > 0) {
		console.log(`apply-migrations: ${tag} already journaled`);
		continue;
	}

	const probe = probeTableForMigration(tag);
	const probeExists =
		probe !== null && (await tableExistsProbe(sql, probe)).length > 0;

	if (!journalOnly && !probeExists) {
		const statements = splitStatements(content);
		for (const statement of statements) {
			await sql.query(statement);
		}
		console.log(`apply-migrations: ${tag} applied ${statements.length} statements`);
	} else if (probeExists) {
		console.log(`apply-migrations: ${tag} DDL present; journal only`);
	} else {
		console.log(`apply-migrations: ${tag} journal-only flag`);
	}

	await sql`
		INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
		VALUES (${hash}, ${createdAt})
	`;
	console.log(`apply-migrations: ${tag} recorded in drizzle.__drizzle_migrations`);
}
