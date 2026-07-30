import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const drizzleDirectory = fileURLToPath(
	new URL("../../drizzle/", import.meta.url),
);

function migrationFiles(): string[] {
	return readdirSync(drizzleDirectory)
		.filter((file) => file.endsWith(".sql"))
		.sort((left, right) => left.localeCompare(right));
}

export function readCurrentMigrationSql(): string {
	return readCurrentMigrations()
		.map(({ sql }) => sql)
		.join("\n--> migration-file-breakpoint\n");
}

export function readCurrentMigrations(): Array<{
	filename: string;
	sql: string;
}> {
	return migrationFiles().map((filename) => ({
		filename,
		sql: readFileSync(`${drizzleDirectory}/${filename}`, "utf8"),
	}));
}

export function readMigrationSqlForTables(
	tableNames: readonly string[],
	options: { includeExtensions?: boolean } = {},
): string {
	const quotedNames = tableNames.map((tableName) => `"${tableName}"`);
	return readCurrentMigrationSql()
		.split(/--> (?:statement|migration-file)-breakpoint\r?\n/)
		.map((statement) => statement.trim())
		.filter(
			(statement) =>
				quotedNames.some((tableName) => statement.includes(tableName)) ||
				(options.includeExtensions === true &&
					statement.startsWith("CREATE EXTENSION")),
		)
		.join("\n--> statement-breakpoint\n");
}
