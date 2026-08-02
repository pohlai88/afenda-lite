import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	buildPublicContract,
	buildPublicContractFixture,
} from "../__tests__/helpers/public-contract.ts";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const fixturePath = path.join(
	packageRoot,
	"__tests__/fixtures/public-contract.fixture.json",
);

if (!process.argv.includes("--write")) {
	throw new Error(
		"Refusing to change the reviewed public contract without --write.",
	);
}

const contract = buildPublicContract(packageRoot);
const fixture = buildPublicContractFixture(contract);
mkdirSync(path.dirname(fixturePath), { recursive: true });
writeFileSync(fixturePath, `${JSON.stringify(fixture, null, "\t")}\n`, "utf8");

const production = contract.entrypoints["."];
const testing = contract.entrypoints["./testing"];
console.log(
	`Serialized ${production?.symbols.length ?? 0} production symbols, ${testing?.symbols.length ?? 0} testing symbols, and ${production?.capabilities?.length ?? 0} capability contracts.`,
);
