/**
 * pnpm governance:packages — repository package-governance gate.
 *
 * Runs catalog / edge / sole-mutator / DAG controls via validate:modules.
 * Full production eligibility also requires turbo typecheck + test (CI quality).
 *
 * Usage:
 *   pnpm governance:packages
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string} command
 * @param {string[]} args
 */
function run(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: root,
			stdio: "inherit",
			shell: true,
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve(undefined);
				return;
			}
			reject(
				new Error(
					`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`,
				),
			);
		});
	});
}

async function main() {
	console.log("governance:packages — validate:modules (catalog · edges · DAG · sole-mutator)");
	await run("pnpm", ["validate:modules"]);
	console.log("governance:packages OK");
	console.log(
		"Evidence: validate:modules (catalog-to-disk, workspace-edge register, dependency DAG, schema write-owner, deep-import, ERP manifests).",
	);
	console.log(
		"Also required for production eligibility: pnpm exec turbo run typecheck test",
	);
}

main().catch((error) => {
	console.error(
		`governance:packages FAIL: ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(1);
});
