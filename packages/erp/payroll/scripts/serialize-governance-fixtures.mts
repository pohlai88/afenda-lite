import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildArchitectureDebtReport } from "../__tests__/helpers/architecture-debt.ts";
import { buildConsumerInventory } from "../__tests__/helpers/consumer-inventory.ts";
import {
	buildPublicContract,
	buildPublicContractFixture,
} from "../__tests__/helpers/public-contract.ts";
import { buildRegistryProjectionContract } from "../__tests__/helpers/registry-projection.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const workspaceRoot = path.resolve(packageRoot, "../../..");
const fixturesDir = path.join(packageRoot, "__tests__/fixtures");

const fixtures = {
	"public-contract.fixture.json": buildPublicContractFixture(
		buildPublicContract(packageRoot),
	),
	"registry-projection.fixture.json":
		buildRegistryProjectionContract(packageRoot),
	"consumer-inventory.fixture.json": buildConsumerInventory(
		workspaceRoot,
		packageRoot,
	),
	"architecture-debt.fixture.json": buildArchitectureDebtReport(
		workspaceRoot,
		packageRoot,
	),
} as const;

for (const [filename, payload] of Object.entries(fixtures)) {
	const target = path.join(fixturesDir, filename);
	writeFileSync(target, `${JSON.stringify(payload, null, "\t")}\n`, "utf8");
	console.log(`Wrote ${target}`);
}
