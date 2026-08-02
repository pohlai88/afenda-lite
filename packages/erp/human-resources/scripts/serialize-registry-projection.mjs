import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRegistryProjectionContract } from "../__tests__/helpers/registry-projection.ts";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const workspaceRoot = path.resolve(packageRoot, "../../..");
const fixturePath = path.join(
	packageRoot,
	"__tests__/fixtures/registry-projection.fixture.json",
);

if (!process.argv.includes("--write")) {
	throw new Error(
		"Refusing to change the reviewed registry projection without --write.",
	);
}

const contract = buildRegistryProjectionContract(packageRoot);
mkdirSync(path.dirname(fixturePath), { recursive: true });
writeFileSync(fixturePath, `${JSON.stringify(contract, null, "\t")}\n`, "utf8");
execFileSync(
	process.execPath,
	[
		path.join(workspaceRoot, "node_modules/@biomejs/biome/bin/biome"),
		"format",
		"--write",
		fixturePath,
	],
	{ cwd: workspaceRoot, stdio: "pipe" },
);

const commands = contract.operations.filter(
	(operation) => operation.kind === "command",
).length;
console.log(
	`Serialized ${contract.operations.length} operations (${commands} commands, ${contract.operations.length - commands} queries), ${contract.eventCatalog.length} events, and ${Object.keys(contract.temporalPolicyOverrides).length} temporal overrides.`,
);
