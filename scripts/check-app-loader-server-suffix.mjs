/**
 * pnpm check:app-loader-server-suffix
 *
 * APP-SCAFFOLDING §9.1 Loaders: every feature module named `load-*.ts` that
 * feeds a page from a package facade / session read must use the `.server.ts`
 * suffix so the server-only boundary is visible from the filename.
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOT = process.cwd();
const FEATURES_REL = path.join("apps", "web", "features");
const SKIP_DIR = new Set([
	"node_modules",
	".git",
	".next",
	".turbo",
	"dist",
	"build",
	"coverage",
]);

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
		if (entry.isFile()) {
			visit(full);
		}
	}
}

/**
 * @param {string} root
 * @returns {{ ok: true } | { ok: false, files: string[] }}
 */
export function checkAppLoaderServerSuffix(root = DEFAULT_ROOT) {
	const featuresDir = path.join(root, FEATURES_REL);
	try {
		if (!statSync(featuresDir).isDirectory()) {
			return { ok: true };
		}
	} catch {
		return { ok: true };
	}

	/** @type {string[]} */
	const offenders = [];
	walkFiles(featuresDir, (file) => {
		const base = path.basename(file);
		if (!/^load-.+\.ts$/u.test(base)) {
			return;
		}
		if (base.endsWith(".server.ts") || base.endsWith(".test.ts")) {
			return;
		}
		offenders.push(path.relative(root, file).replace(/\\/g, "/"));
	});

	if (offenders.length === 0) {
		return { ok: true };
	}
	return { ok: false, files: offenders.sort() };
}

function main() {
	const result = checkAppLoaderServerSuffix(DEFAULT_ROOT);
	if (result.ok) {
		console.log("check-app-loader-server-suffix: ok");
		process.exit(0);
	}
	console.error(
		"check-app-loader-server-suffix: feature loaders must use the .server.ts suffix:",
	);
	for (const file of result.files) {
		console.error(`  - ${file}`);
	}
	console.error(
		'Rename load-*.ts → load-*.server.ts and update imports (APP-SCAFFOLDING §9.1).',
	);
	process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
	main();
}
