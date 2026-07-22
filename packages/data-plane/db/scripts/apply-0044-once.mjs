import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.join(root, "../../..");
const envPath = path.join(repoRoot, ".env.local");

for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#")) continue;
	const match = /^DATABASE_URL\s*=\s*(.*)$/.exec(trimmed);
	if (!match) continue;
	let value = match[1].trim();
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		value = value.slice(1, -1);
	}
	process.env.DATABASE_URL = value;
	break;
}

if (!process.env.DATABASE_URL) {
	console.error("DATABASE_URL missing");
	process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const probe = await sql`
	SELECT table_name FROM information_schema.tables
	WHERE table_schema = 'public' AND table_name = 'hr_performance_cycle'
`;
if (probe.length > 0) {
	console.log("hr_performance_cycle already exists");
	process.exit(0);
}

const content = fs.readFileSync(
	path.join(root, "drizzle", "0044_hr_performance_ddl.sql"),
	"utf8",
);
const statements = content
	.split(/--> statement-breakpoint\n/)
	.map((statement) => statement.trim())
	.filter(Boolean);

for (const statement of statements) {
	await sql.query(statement);
}

const after = await sql`
	SELECT table_name FROM information_schema.tables
	WHERE table_schema = 'public' AND table_name LIKE 'hr_performance%'
	ORDER BY table_name
`;
console.log(
	`applied ${statements.length} statements; tables: ${after.map((r) => r.table_name).join(", ")}`,
);
