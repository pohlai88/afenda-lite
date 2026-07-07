import { readdirSync } from "node:fs";
import { join } from "node:path";

export function listMigrationFiles(rootDir = process.cwd()) {
  return readdirSync(join(rootDir, "db", "migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort();
}
