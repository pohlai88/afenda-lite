import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildConsumerInventory } from "../__tests__/helpers/consumer-inventory.ts";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const workspaceRoot = path.resolve(packageRoot, "../../..");
const fixturePath = path.join(
	packageRoot,
	"__tests__/fixtures/consumer-inventory.fixture.json",
);

if (!process.argv.includes("--write")) {
	throw new Error("Refusing to change the reviewed inventory without --write.");
}

const inventory = buildConsumerInventory(workspaceRoot, packageRoot);
mkdirSync(path.dirname(fixturePath), { recursive: true });
writeFileSync(
	fixturePath,
	`${JSON.stringify(inventory, null, "\t")}\n`,
	"utf8",
);

const counts = Object.groupBy(
	inventory.references,
	(reference) => reference.disposition,
);
console.log(
	`Serialized ${inventory.references.length} references: ${counts.allowed?.length ?? 0} allowed, ${counts.allowlisted?.length ?? 0} allowlisted, ${counts["manual-review"]?.length ?? 0} manual-review, ${counts.forbidden?.length ?? 0} forbidden.`,
);
