/**
 * pnpm check:app-action-runners
 *
 * APP-SCAFFOLDING §9.1 Runners: every exported `run*Action` declaration must
 * live under `apps/web/app/actions/_runtime/`. Non-exported FormData helpers
 * (establishment / lifecycle) are outside this scan.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOT = process.cwd();
const ACTIONS_REL = path.join("apps", "web", "app", "actions");
const SKIP_DIR = new Set([
	"node_modules",
	".git",
	".next",
	".turbo",
	"dist",
	"build",
	"coverage",
	"__tests__",
]);

const EXPORTED_RUNNER =
	/^export\s+(?:async\s+)?(?:function|const)\s+(run\w+Action)\b/gm;

/**
 * @param {string} dir
 * @param {(file: string) => void} visit
 */
function walkFiles(dir, visit) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		if (entry.name.startsWith(".")) {
			continue;
		}
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (SKIP_DIR.has(entry.name)) {
				continue;
			}
			walkFiles(full, visit);
			continue;
		}
		if (entry.isFile() && /\.(ts|tsx)$/u.test(entry.name)) {
			visit(full);
		}
	}
}

/**
 * @param {string} absoluteFile
 * @param {string} actionsDir
 */
function isUnderRuntime(absoluteFile, actionsDir) {
	const relative = path.relative(actionsDir, absoluteFile).replace(/\\/g, "/");
	return relative === "_runtime" || relative.startsWith("_runtime/");
}

/**
 * @param {string} root
 * @returns {{ ok: true } | { ok: false, offenders: Array<{ file: string, names: string[] }> }}
 */
export function checkAppActionRunners(root = DEFAULT_ROOT) {
	const actionsDir = path.join(root, ACTIONS_REL);
	try {
		if (!statSync(actionsDir).isDirectory()) {
			return { ok: true };
		}
	} catch {
		return { ok: true };
	}

	/** @type {Array<{ file: string, names: string[] }>} */
	const offenders = [];

	walkFiles(actionsDir, (file) => {
		if (isUnderRuntime(file, actionsDir)) {
			return;
		}
		const source = readFileSync(file, "utf8");
		const names = [];
		for (const match of source.matchAll(EXPORTED_RUNNER)) {
			names.push(match[1]);
		}
		if (names.length > 0) {
			offenders.push({
				file: path.relative(root, file).replace(/\\/g, "/"),
				names: [...new Set(names)].sort(),
			});
		}
	});

	if (offenders.length === 0) {
		return { ok: true };
	}
	return {
		ok: false,
		offenders: offenders.sort((a, b) => a.file.localeCompare(b.file)),
	};
}

function main() {
	const result = checkAppActionRunners(DEFAULT_ROOT);
	if (result.ok) {
		console.log("check-app-action-runners: ok");
		process.exit(0);
	}
	console.error(
		"check-app-action-runners: exported run*Action must live under app/actions/_runtime/:",
	);
	for (const offender of result.offenders) {
		console.error(`  - ${offender.file}: ${offender.names.join(", ")}`);
	}
	console.error(
		"Move actor-class runners into _runtime/ (APP-SCAFFOLDING §5.2 / §9.1). Do not add feature-local run*Action wrappers.",
	);
	process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
	main();
}
