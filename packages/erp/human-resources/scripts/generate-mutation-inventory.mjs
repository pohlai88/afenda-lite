/**
 * Regenerate __tests__/fixtures/mutation-inventory.json from module ids + registry.
 *
 * Run: pnpm exec tsx packages/erp/human-resources/scripts/generate-mutation-inventory.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");

const { HUMAN_RESOURCES_COMMAND_IDS, HUMAN_RESOURCES_QUERY_IDS } = await import(
	pathToFileURL(path.join(pkgRoot, "src/module-ids.ts")).href
);
const { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } = await import(
	pathToFileURL(path.join(pkgRoot, "src/emissions/registry.ts")).href
);

const classifiedIds = Object.keys(
	HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
);
const classifiedSet = new Set(classifiedIds);
const unclassified = HUMAN_RESOURCES_COMMAND_IDS.filter(
	(id) => !classifiedSet.has(id),
);

let auditOnlyCount = 0;
let domainEventCount = 0;
for (const definition of Object.values(
	HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
)) {
	if (definition.emissionMode === "audit_only") {
		auditOnlyCount += 1;
	} else {
		domainEventCount += 1;
	}
}

const inventory = {
	totalCommandIds: HUMAN_RESOURCES_COMMAND_IDS.length,
	totalQueryIds: HUMAN_RESOURCES_QUERY_IDS.length,
	totalMutationCommandIds: HUMAN_RESOURCES_COMMAND_IDS.length,
	classifiedMutationIds: classifiedIds.length,
	unclassifiedMutationIds: unclassified.length,
	auditOnlyCount,
	domainEventCount,
	generatedAt: new Date().toISOString(),
	unclassified: [...unclassified].sort(),
};

const fixturePath = path.join(
	pkgRoot,
	"__tests__/fixtures/mutation-inventory.json",
);
fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
fs.writeFileSync(fixturePath, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Wrote ${fixturePath}`);
