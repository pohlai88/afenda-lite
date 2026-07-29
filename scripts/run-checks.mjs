import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SCRIPT_PATH_PATTERN = /scripts\/([A-Za-z0-9._/-]+\.(?:mjs|mts))/;

/**
 * Run only forward gates whose executable scripts and required surfaces exist on disk.
 */
const preferred = [
	"check:docs-naming",
	"check:docs-trunk-ban",
	"check:tsconfig-no-baseurl",
	"check:tsconfig-governance",
	"check:editor-biome",
	"check:biome-governance",
	"check:env-consumers",
	"check:testing-governance",
	"check:module-quality",
	"check:doc-integrity",
	"check:openapi",
	"check:docs-app",
];

function scriptExists(scriptName) {
	const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
	const cmd = pkg.scripts?.[scriptName];
	if (!cmd) {
		return false;
	}
	// Living docs/ removed (cutover 71176a0) — Scratch docs-V2; skip Living gates.
	if (
		(scriptName === "check:docs-naming" ||
			scriptName === "check:doc-integrity" ||
			scriptName === "check:module-quality") &&
		!fs.existsSync("docs")
	) {
		return false;
	}
	if (scriptName === "check:doc-integrity" && !fs.existsSync("docs/api")) {
		return false;
	}
	if (scriptName === "check:module-quality" && !fs.existsSync("docs/modules")) {
		return false;
	}
	if (scriptName === "check:docs-app" && !fs.existsSync("apps/docs")) {
		return false;
	}
	if (String(cmd).includes(".cursor/skills/")) {
		return true;
	}
	const m = String(cmd).match(SCRIPT_PATH_PATTERN);
	if (!m) {
		return true;
	}
	return fs.existsSync(path.join("scripts", m[1]));
}

const checks = preferred.filter(scriptExists);

function runCheck(script) {
	return new Promise((resolve, reject) => {
		const child = spawn("pnpm", ["run", script], {
			stdio: "inherit",
			shell: true,
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve(undefined);
				return;
			}
			reject(new Error(`${script} failed with exit code ${code ?? "unknown"}`));
		});
	});
}

async function main() {
	if (checks.length === 0) {
		console.error("checks: no docs-capable gates available");
		process.exit(1);
	}
	await Promise.all(checks.map((script) => runCheck(script)));
	console.log(`checks OK (${checks.length} executable forward gates)`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
