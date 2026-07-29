import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
	assertEditToken,
	assertProtectedHeaders,
	packageProtectionHash,
	protectionFilePathFor,
	repoRoot,
	resolvePackageRoot,
} from "./protect-package-core.mjs";

async function main() {
	await assertEditToken();

	const packageRoot = resolvePackageRoot(process.argv[2]);
	await assertProtectedHeaders(packageRoot);

	const protectionFilePath = protectionFilePathFor(packageRoot);
	const hash = await packageProtectionHash(packageRoot);

	await writeFile(protectionFilePath, hash, "utf8");

	console.log(`Updated ${path.relative(repoRoot, protectionFilePath)}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
