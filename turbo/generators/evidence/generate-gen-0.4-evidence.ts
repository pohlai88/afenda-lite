import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runGen04ReadOnlyProof } from "./gen-0.4-proof.ts";

const evidenceDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evidenceDirectory, "../../..");
const outputPath = resolve(evidenceDirectory, "gen-0.4-closure.json");
const evidence = await runGen04ReadOnlyProof(repositoryRoot);

await writeFile(outputPath, `${JSON.stringify(evidence, null, "\t")}\n`);
