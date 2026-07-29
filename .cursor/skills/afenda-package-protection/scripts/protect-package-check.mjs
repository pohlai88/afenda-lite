import { readFile } from "node:fs/promises";
import path from "node:path";
import {
	packageProtectionHash,
	protectionFilePathFor,
	repoRoot,
	resolvePackageRoot,
} from "./protect-package-core.mjs";

async function main() {
	const packageRoot = resolvePackageRoot(process.argv[2]);
	const protectionFilePath = protectionFilePathFor(packageRoot);
	const actual = await readFile(protectionFilePath, "utf8").catch(() => undefined);
	const expected = await packageProtectionHash(packageRoot);

	if (actual !== expected) {
		throw new Error(
			`${path.relative(repoRoot, packageRoot)} protection hash is stale. Review the diff. For intentional edits, set AFENDA_PROTECTED_EDIT_TOKEN and run protect:update after tests pass.`,
		);
	}

	console.log(`${path.relative(repoRoot, packageRoot)} protection hash is current.`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
