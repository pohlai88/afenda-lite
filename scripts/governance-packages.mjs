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
const pnpmExecPath = process.env.npm_execpath;

/**
 * @param {string} command
 * @param {string[]} args
 */
function runPnpm(args) {
	if (!pnpmExecPath) {
		throw new Error("npm_execpath is required; run this gate through pnpm");
	}
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [pnpmExecPath, ...args], {
			cwd: root,
			stdio: "inherit",
			shell: false,
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve(undefined);
				return;
			}
			reject(
				new Error(
					`pnpm ${args.join(" ")} failed with exit code ${code ?? "unknown"}`,
				),
			);
		});
	});
}

async function main() {
	console.log(
		"governance:packages — validate:modules (catalog · edges · DAG · sole-mutator)",
	);
	await runPnpm(["validate:modules"]);
	console.log("governance:packages OK");
	// A gate must not claim evidence it does not own. `check:env-consumers` is a
	// peer ci-required gate with its own contract, fixtures, owner, and
	// diagnostics — the dispatcher runs it, not this script. Re-running it here
	// would double execution and make failure ownership ambiguous.
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
