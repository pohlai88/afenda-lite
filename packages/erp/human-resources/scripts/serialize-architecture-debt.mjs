import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildArchitectureDebtReport } from "../__tests__/helpers/architecture-debt.ts";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const workspaceRoot = path.resolve(packageRoot, "../../..");
const fixture = path.join(
	packageRoot,
	"__tests__/fixtures/architecture-debt.fixture.json",
);

if (!process.argv.includes("--write")) {
	throw new Error(
		"Refusing to change the reviewed architecture debt baseline without --write.",
	);
}

writeFileSync(
	fixture,
	`${JSON.stringify(buildArchitectureDebtReport(workspaceRoot, packageRoot), null, 2)}\n`,
);
execFileSync(
	process.execPath,
	[
		path.join(workspaceRoot, "node_modules/@biomejs/biome/bin/biome"),
		"format",
		"--write",
		fixture,
	],
	{ cwd: workspaceRoot, stdio: "pipe" },
);
console.log(`Serialized ${path.relative(workspaceRoot, fixture)}`);
