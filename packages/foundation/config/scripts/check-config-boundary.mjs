#!/usr/bin/env node
/**
 * @afenda/config repository boundary
 * Contract: packages/foundation/config/CONTRACT.md
 * Protected: changes require the local pre-edit token and a contract amendment.
 *
 * Executes CONTRACT.md. One named assertion per invariant; every failure cites
 * its ID. Dependency-free. The config package is discovered by name rather than
 * by path, so relocating it does not break the check.
 *
 * INV-10 closes the loop: the invariant IDs written in CONTRACT.md and the IDs
 * this file implements must be the same set. A rule cannot be documented into
 * existence without an executing assertion, nor enforced without being written
 * down.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PKG = "@afenda/config";

/** Every invariant this file asserts. Compared against CONTRACT.md by INV-10. */
const IMPLEMENTED = Object.freeze([
	"INV-1",
	"INV-2",
	"INV-3",
	"INV-4",
	"INV-5",
	"INV-6",
	"INV-7",
	"INV-8",
	"INV-9",
	"INV-10",
]);

/**
 * INV-9. The one place repository layout is encoded. Edit this, not the logic.
 * First match wins. Each zone names the single profile its packages must
 * extend; `EXCEPTIONS` records the deliberate departures by path.
 */
const PROFILE_ZONES = [
	[/^apps[/\\]/, "nextjs.json"],
	[/^packages[/\\]surfaces[/\\]/, "react-library.json"],
	[/^testing([/\\]|$)/, "react-library.json"],
	[/^e2e([/\\]|$)/, "node-library.json"],
	[/^packages[/\\]/, "node-library.json"],
];

/**
 * INV-9 exceptions. `@afenda/errors` is the one package that must compile
 * without Node ambient types — it is consumed from browser and server bundles
 * alike — so it extends the runtime-neutral base rather than node-library.
 */
const PROFILE_EXCEPTIONS = new Map([
	// Consumed from browser and server bundles alike, so it must compile without
	// Node ambient types.
	["packages/foundation/errors", "base.json"],
	// A Vite-driven Storybook host, not a Next.js app; the Next plugin and
	// `jsx: preserve` would both be wrong here.
	["apps/storybook", "react-library.json"],
]);

/** INV-6. Consumers may always own these. */
const CONSUMER_OWNED = new Set(["rootDir", "paths"]);

/**
 * INV-6. TypeScript replaces rather than merges array-valued options across
 * `extends`, so a consumer that sets one silently discards the profile's
 * entries. These may be widened but never narrowed.
 */
const SUPERSET_ONLY = new Set(["lib", "types"]);

/** Trees that hold real workspace sources. Agent and doc trees are not scanned. */
const SOURCE_ROOTS = ["apps", "e2e", "packages", "testing"];

const SKIP_DIRECTORIES = new Set([
	".git",
	".next",
	".turbo",
	"_reference",
	"build",
	"coverage",
	"dist",
	"node_modules",
	"playwright-report",
	"test-results",
]);

const toPosix = (value) => value.replaceAll("\\", "/");

function* walk(directory) {
	let entries;
	try {
		entries = readdirSync(directory);
	} catch {
		return;
	}
	for (const name of entries) {
		if (SKIP_DIRECTORIES.has(name)) continue;
		const path = join(directory, name);
		let stats;
		try {
			stats = statSync(path);
		} catch {
			continue;
		}
		if (stats.isDirectory()) yield* walk(path);
		else yield path;
	}
}

/** tsconfig.json is JSONC in practice; biome.jsonc always is. */
function readJsonc(file, violations) {
	const raw = readFileSync(file, "utf8")
		.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (match, comment) =>
			comment ? "" : match,
		)
		.replace(/,(\s*[}\]])/g, "$1");
	try {
		return JSON.parse(raw);
	} catch (error) {
		violations.push(
			`PARSE  ${file}: invalid JSON (${error instanceof Error ? error.message : String(error)})`,
		);
		return null;
	}
}

/**
 * Resolves an array-valued compiler option through a profile's local extends
 * chain, mirroring TypeScript's replace-not-merge semantics.
 */
function effectiveOption(profiles, name, key, seen = new Set()) {
	if (seen.has(name)) return [];
	seen.add(name);
	const profile = profiles[name] ?? {};
	const own = profile.compilerOptions?.[key];
	if (Array.isArray(own)) return own;
	const parent =
		typeof profile.extends === "string" ? profile.extends.replace("./", "") : null;
	return parent ? effectiveOption(profiles, parent, key, seen) : [];
}

/**
 * Every compilerOptions key a profile sets along its own extends chain. Governed
 * sets are per-profile, not a union across all of them: `allowJs` is governed
 * for a `nextjs.json` consumer and simply unset for a `node-library.json` one,
 * and forbidding it in the latter would be an invariant nobody wrote.
 */
function governedKeys(profiles, name, seen = new Set()) {
	if (!name || seen.has(name)) return new Set();
	seen.add(name);
	const profile = profiles[name] ?? {};
	const keys = new Set(Object.keys(profile.compilerOptions ?? {}));
	const parent =
		typeof profile.extends === "string" ? profile.extends.replace("./", "") : null;
	for (const key of governedKeys(profiles, parent, seen)) keys.add(key);
	return keys;
}

/**
 * TypeScript's `lib` names are hierarchical: `lib.es2023.d.ts` references
 * `lib.es2022.d.ts`, so `["ES2023"]` genuinely contains `ES2022`. Comparing the
 * arrays as opaque strings would demand `["ES2022", "ES2023"]` and turn a real
 * rule into noise. Non-ES entries (DOM, DOM.Iterable, WebWorker) are literal.
 */
const ES_LIB = /^ES(\d{4})(\.|$)/i;

function libSubsumes(declared, inherited) {
	if (declared.some((entry) => entry.toLowerCase() === inherited.toLowerCase())) return true;
	const target = ES_LIB.exec(inherited);
	if (!target) return false;
	return declared.some((entry) => {
		const candidate = ES_LIB.exec(entry);
		return candidate ? Number(candidate[1]) >= Number(target[1]) : false;
	});
}

/**
 * @param {string} repositoryRoot
 * @returns {readonly string[]} sorted violations, each prefixed by its invariant ID
 */
export function checkConfigBoundary(repositoryRoot) {
	const violations = [];
	const fail = (invariant, where, message) => {
		const location = toPosix(relative(repositoryRoot, where)) || ".";
		violations.push(`${invariant}  ${location}: ${message}`);
	};

	const files = [];
	for (const root of SOURCE_ROOTS) files.push(...walk(join(repositoryRoot, root)));
	for (const name of ["package.json", "tsconfig.json", "biome.jsonc", "biome.json"]) {
		const path = join(repositoryRoot, name);
		if (existsSync(path)) files.push(path);
	}

	const manifests = files
		.filter((file) => file.endsWith(`${sep}package.json`))
		.map((file) => ({ file, json: readJsonc(file, violations) }))
		.filter((manifest) => manifest.json);

	const configPackage = manifests.find((manifest) => manifest.json.name === PKG);
	if (!configPackage) {
		violations.push(`SETUP  .: could not locate ${PKG} in ${SOURCE_ROOTS.join(", ")}.`);
		return violations.toSorted();
	}

	const configDirectory = dirname(configPackage.file);
	const exportsMap = configPackage.json.exports ?? {};
	const insideConfigPackage = (file) => file.startsWith(configDirectory + sep);

	/* ---------- INV-1 · no root export, no foreign target ---------- */

	if (Object.hasOwn(exportsMap, ".")) {
		fail(
			"INV-1",
			configPackage.file,
			'exports contains a "." key. The package is consumed through `extends` only and has no root export; delete the key and src/index.ts.',
		);
	}
	for (const [key, target] of Object.entries(exportsMap)) {
		if (typeof target !== "string" || !target.startsWith("./")) {
			fail("INV-1", configPackage.file, `export "${key}" does not point to a local file.`);
		}
	}
	if (existsSync(join(configDirectory, "src"))) {
		fail(
			"INV-1",
			join(configDirectory, "src"),
			"the package ships JSON profiles only. A src/ tree implies a runtime surface that no export exposes; delete it.",
		);
	}

	/* ---------- INV-2 · target is the identically named JSON artifact ---------- */

	for (const [key, target] of Object.entries(exportsMap)) {
		if (key === ".") continue;
		if (!key.endsWith(".json")) {
			fail(
				"INV-2",
				configPackage.file,
				`export "${key}" is extensionless. Extensionless aliases let two specifiers resolve to one profile.`,
			);
			continue;
		}
		if (target !== key) {
			fail(
				"INV-2",
				configPackage.file,
				`export "${key}" targets "${target}"; it must target the identically named file.`,
			);
		}
		if (!existsSync(join(configDirectory, key))) {
			fail("INV-2", configPackage.file, `export "${key}" has no file on disk.`);
		}
	}

	/* ---------- INV-3 · devDependencies only ---------- */

	for (const { file, json } of manifests) {
		for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
			if (json[field]?.[PKG]) {
				fail("INV-3", file, `${PKG} is declared in ${field}; it must be a devDependency.`);
			}
		}
	}

	/* ---------- INV-4 · no runtime import ---------- */

	const RUNTIME_TREE =
		/^(apps\/|packages\/[^/]+\/[^/]+\/src\/|packages\/[^/]+\/src\/|testing\/|e2e\/)/;
	const RUNTIME_REFERENCE = new RegExp(
		String.raw`(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']${PKG}(?:/[^"']*)?["']`,
	);

	for (const file of files) {
		if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
		if (/\.(config|test|spec)\./.test(file)) continue;
		const relativePath = toPosix(relative(repositoryRoot, file));
		if (!RUNTIME_TREE.test(relativePath)) continue;
		if (RUNTIME_REFERENCE.test(readFileSync(file, "utf8"))) {
			fail(
				"INV-4",
				file,
				`runtime ${PKG} reference. The package is dev-time only and is consumed through \`extends\`, never imported.`,
			);
		}
	}

	/* ---------- INV-5 · every extends specifier is a declared export ---------- */

	const tsconfigs = files.filter(
		(file) => /[/\\]tsconfig(\.\w+)?\.json$/.test(file) && !insideConfigPackage(file),
	);
	const biomeConfigs = files.filter(
		(file) => /[/\\]biome\.jsonc?$/.test(file) && !insideConfigPackage(file),
	);

	for (const file of [...tsconfigs, ...biomeConfigs]) {
		const json = readJsonc(file, violations);
		if (!json) continue;
		const specifiers = [json.extends]
			.flat()
			.filter((value) => typeof value === "string" && value.startsWith(PKG));
		for (const specifier of specifiers) {
			const key = `.${specifier.slice(PKG.length)}`;
			if (!Object.hasOwn(exportsMap, key)) {
				fail(
					"INV-5",
					file,
					`extends "${specifier}" is not a declared export. Valid: ${Object.keys(exportsMap).join(", ")}`,
				);
			}
		}
	}

	/* ---------- INV-6 / INV-8 · governed options, baseUrl ---------- */

	const profileNames = Object.keys(exportsMap)
		.filter((key) => key.startsWith("./tsconfig/"))
		.map((key) => key.slice("./tsconfig/".length));

	const profiles = Object.fromEntries(
		profileNames.map((name) => [
			name,
			existsSync(join(configDirectory, "tsconfig", name))
				? (readJsonc(join(configDirectory, "tsconfig", name), violations) ?? {})
				: {},
		]),
	);

	for (const file of tsconfigs) {
		const json = readJsonc(file, violations);
		const compilerOptions = json?.compilerOptions;
		if (!compilerOptions) continue;

		if (Object.hasOwn(compilerOptions, "baseUrl")) {
			fail(
				"INV-8",
				file,
				"baseUrl is banned repository-wide; it makes bare specifiers resolve against a directory instead of the package graph. Use paths relative to this tsconfig.",
			);
		}

		const specifier = [json.extends]
			.flat()
			.find((value) => typeof value === "string" && value.startsWith(PKG));
		const profile = specifier?.split("/").pop();
		// Derived from the profile this consumer actually extends, never restated.
		// A key added to that profile becomes governed in the same commit — the
		// drift a hand-maintained list cannot avoid.
		const governed = governedKeys(profiles, profile);

		for (const key of Object.keys(compilerOptions)) {
			if (CONSUMER_OWNED.has(key) || key === "baseUrl" || !governed.has(key)) continue;

			if (SUPERSET_ONLY.has(key)) {
				const value = compilerOptions[key];
				if (!Array.isArray(value)) {
					fail("INV-6", file, `"${key}" must be an array.`);
					continue;
				}
				const inherited = effectiveOption(profiles, profile, key);
				const dropped =
					key === "lib"
						? inherited.filter((entry) => !libSubsumes(value, entry))
						: inherited.filter((entry) => !value.includes(entry));
				if (dropped.length) {
					fail(
						"INV-6",
						file,
						`"${key}" drops inherited entries [${dropped.join(", ")}]. Arrays replace rather than merge — restate the profile's entries in full, then add to them.`,
					);
				}
				continue;
			}
			fail(
				"INV-6",
				file,
				`redeclares governed option "${key}". Change it in ${PKG} so every consumer moves together.`,
			);
		}
	}

	/* ---------- INV-7 · base excludes are glob-form ---------- */

	for (const entry of profiles["base.json"]?.exclude ?? []) {
		if (!entry.startsWith("**/")) {
			fail(
				"INV-7",
				join(configDirectory, "tsconfig", "base.json"),
				`exclude "${entry}" is not glob-form. A relative path in an extended config resolves against this package rather than the consumer, and specifying exclude at all suppresses TypeScript's default. Use "**/${entry}".`,
			);
		}
	}

	/* ---------- INV-9 · one correct profile per package ---------- */

	for (const { file, json } of manifests) {
		const directory = dirname(file);
		if (directory === repositoryRoot || insideConfigPackage(file)) continue;
		if (!json.name) continue;

		const relativeDirectory = toPosix(relative(repositoryRoot, directory));
		const zone = PROFILE_ZONES.find(([pattern]) => pattern.test(relativeDirectory));
		if (!zone) continue;
		const expected = PROFILE_EXCEPTIONS.get(relativeDirectory) ?? zone[1];

		const tsconfigFile = join(directory, "tsconfig.json");
		if (!existsSync(tsconfigFile)) {
			fail("INV-9", directory, `no tsconfig.json; expected one extending ${expected}.`);
			continue;
		}
		const tsconfig = readJsonc(tsconfigFile, violations);
		const specifier = [tsconfig?.extends]
			.flat()
			.find((value) => typeof value === "string" && value.startsWith(PKG));
		if (!specifier) {
			fail("INV-9", tsconfigFile, `does not extend a ${PKG} profile. Expected ${expected}.`);
		} else if (!specifier.endsWith(expected)) {
			fail(
				"INV-9",
				tsconfigFile,
				`extends ${specifier.split("/").pop()}; layout requires ${expected}.`,
			);
		}
	}

	/* ---------- INV-10 · contract and implementation agree ---------- */

	const contractFile = join(configDirectory, "CONTRACT.md");
	if (!existsSync(contractFile)) {
		fail("INV-10", configDirectory, "CONTRACT.md is missing; the invariants have no stated source.");
	} else {
		const contract = readFileSync(contractFile, "utf8");
		const documented = new Set(contract.match(/\bINV-\d+\b/g) ?? []);
		const implemented = new Set(IMPLEMENTED);
		for (const id of documented) {
			if (!implemented.has(id)) {
				fail(
					"INV-10",
					contractFile,
					`${id} is documented but has no assertion. Implement it or remove it — a rule that does not execute is not a rule.`,
				);
			}
		}
		for (const id of implemented) {
			if (!documented.has(id)) {
				fail(
					"INV-10",
					contractFile,
					`${id} is asserted but undocumented. Every enforced rule must be stated in the contract.`,
				);
			}
		}
	}

	return violations.toSorted();
}

/** Walks up from `from` to the directory holding pnpm-workspace.yaml. */
export function findRepositoryRoot(from) {
	let current = resolve(from);
	for (;;) {
		if (existsSync(join(current, "pnpm-workspace.yaml"))) return current;
		const parent = dirname(current);
		if (parent === current) {
			throw new Error("Could not locate the repository root (no pnpm-workspace.yaml found).");
		}
		current = parent;
	}
}

function main() {
	const repositoryRoot = findRepositoryRoot(dirname(fileURLToPath(import.meta.url)));
	const violations = checkConfigBoundary(repositoryRoot);
	if (violations.length > 0) {
		console.error(`\n${PKG} boundary: ${violations.length} violation(s)\n`);
		for (const violation of violations) console.error(`  ${violation}\n`);
		console.error("See packages/foundation/config/CONTRACT.md for each invariant.\n");
		process.exitCode = 1;
		return;
	}
	console.log(`${PKG} boundary: all invariants hold.`);
}

const entryFile = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entryFile && import.meta.url === pathToFileURL(entryFile).href) {
	main();
}
