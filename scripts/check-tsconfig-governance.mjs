import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readJsonc } from "./lib/read-jsonc.mjs";

const CENTRAL_OPTIONS = new Set([
	"target",
	"module",
	"moduleResolution",
	"moduleDetection",
	"strict",
	"exactOptionalPropertyTypes",
	"noUncheckedIndexedAccess",
	"noImplicitOverride",
	"noUncheckedSideEffectImports",
	"isolatedModules",
	"verbatimModuleSyntax",
	"resolveJsonModule",
	"noEmit",
	"skipLibCheck",
	"forceConsistentCasingInFileNames",
	"incremental",
]);

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

const PRESET_DIRECTORY = "packages/foundation/config/tsconfig";
const TSCONFIG_FILE_PATTERN = /^tsconfig.*\.json$/i;

function toPosixPath(value) {
	return value.replaceAll("\\", "/");
}

function readConfig(file, errors) {
	const { config, error } = readJsonc(file);
	if (error) {
		errors.push(`${toPosixPath(file)}: invalid JSONC (${error})`);
		return;
	}
	return config;
}

function loadApprovedPresets(root, errors) {
	const packageFile = join(root, "packages/foundation/config/package.json");
	const packageJson = readConfig(packageFile, errors);
	const approved = new Set();
	for (const [exportPath, target] of Object.entries(
		packageJson?.exports ?? {},
	)) {
		if (
			!(exportPath.startsWith("./tsconfig/") && exportPath.endsWith(".json"))
		) {
			continue;
		}
		if (target !== exportPath) {
			errors.push(
				`packages/foundation/config/package.json: export ${exportPath} must target itself`,
			);
			continue;
		}
		approved.add(`@afenda/config/${exportPath.slice(2)}`);
	}
	if (approved.size === 0) {
		errors.push(
			"packages/foundation/config/package.json: no TypeScript profiles are exported",
		);
	}
	return approved;
}

function listTsconfigs(root) {
	const files = [];
	function walk(directory) {
		for (const name of readdirSync(directory)) {
			if (SKIP_DIRECTORIES.has(name)) {
				continue;
			}
			const file = join(directory, name);
			let stats;
			try {
				stats = statSync(file);
			} catch {
				continue;
			}
			if (stats.isDirectory()) {
				walk(file);
			} else if (TSCONFIG_FILE_PATTERN.test(name)) {
				files.push(file);
			}
		}
	}
	walk(root);
	return files;
}

function resolveRelativeExtends(configFile, extendsValue) {
	const candidate = resolve(dirname(configFile), extendsValue);
	if (existsSync(candidate)) {
		return candidate;
	}
	const jsonCandidate = `${candidate}.json`;
	return existsSync(jsonCandidate) ? jsonCandidate : undefined;
}

function findApprovedPreset(
	configFile,
	extendsValue,
	approvedPresets,
	errors,
	seen = new Set(),
) {
	if (approvedPresets.has(extendsValue)) {
		return extendsValue;
	}
	if (!extendsValue.startsWith(".")) {
		return;
	}
	const parentFile = resolveRelativeExtends(configFile, extendsValue);
	if (!parentFile) {
		return;
	}
	if (seen.has(parentFile)) {
		errors.push(`${toPosixPath(configFile)}: circular tsconfig extends chain`);
		return;
	}
	seen.add(parentFile);
	const parent = readConfig(parentFile, errors);
	if (!parent || typeof parent.extends !== "string") {
		return;
	}
	return findApprovedPreset(
		parentFile,
		parent.extends,
		approvedPresets,
		errors,
		seen,
	);
}

function sameJsonValue(actual, expected) {
	return JSON.stringify(actual) === JSON.stringify(expected);
}

function checkPreset(root, relativeFile, expected, errors) {
	const file = join(root, relativeFile);
	const config = readConfig(file, errors);
	if (!config) {
		return;
	}
	if (expected.extends && config.extends !== expected.extends) {
		errors.push(`${relativeFile}: extends must be ${expected.extends}`);
	}
	for (const [key, expectedValue] of Object.entries(expected.compilerOptions)) {
		if (!sameJsonValue(config.compilerOptions?.[key], expectedValue)) {
			errors.push(
				`${relativeFile}: compilerOptions.${key} must be ${JSON.stringify(expectedValue)}`,
			);
		}
	}
}

export function checkTsconfigGovernance(root) {
	const errors = [];
	const approvedPresets = loadApprovedPresets(root, errors);
	checkPreset(
		root,
		`${PRESET_DIRECTORY}/base.json`,
		{
			compilerOptions: {
				target: "ES2022",
				lib: ["ES2022"],
				module: "preserve",
				moduleResolution: "bundler",
				moduleDetection: "force",
				types: [],
				strict: true,
				exactOptionalPropertyTypes: true,
				noUncheckedIndexedAccess: true,
				noImplicitOverride: true,
				noUncheckedSideEffectImports: true,
				isolatedModules: true,
				verbatimModuleSyntax: true,
				noEmit: true,
			},
		},
		errors,
	);
	checkPreset(
		root,
		`${PRESET_DIRECTORY}/node-library.json`,
		{ extends: "./base.json", compilerOptions: { types: ["node"] } },
		errors,
	);
	checkPreset(
		root,
		`${PRESET_DIRECTORY}/react-library.json`,
		{
			extends: "./base.json",
			compilerOptions: {
				lib: ["DOM", "DOM.Iterable", "ES2022"],
				jsx: "react-jsx",
				types: ["react", "react-dom"],
			},
		},
		errors,
	);
	checkPreset(
		root,
		`${PRESET_DIRECTORY}/nextjs.json`,
		{
			extends: "./react-library.json",
			compilerOptions: {
				allowJs: true,
				plugins: [{ name: "next" }],
				types: ["node", "react", "react-dom"],
			},
		},
		errors,
	);

	for (const file of listTsconfigs(root)) {
		const relativeFile = toPosixPath(relative(root, file));
		if (relativeFile.startsWith(`${PRESET_DIRECTORY}/`)) {
			continue;
		}
		const config = readConfig(file, errors);
		if (!config) {
			continue;
		}
		if (typeof config.extends !== "string") {
			errors.push(
				`${relativeFile}: must extend an @afenda/config TypeScript preset`,
			);
			continue;
		}
		const preset = findApprovedPreset(
			file,
			config.extends,
			approvedPresets,
			errors,
		);
		if (!preset) {
			errors.push(
				`${relativeFile}: extends chain must resolve to an approved @afenda/config preset`,
			);
		}
		for (const option of Object.keys(config.compilerOptions ?? {})) {
			if (CENTRAL_OPTIONS.has(option)) {
				errors.push(
					`${relativeFile}: compilerOptions.${option} belongs in @afenda/config`,
				);
			}
		}
	}

	return errors;
}

function main() {
	const root = process.cwd();
	const errors = checkTsconfigGovernance(root);
	if (errors.length > 0) {
		console.error("check-tsconfig-governance: FAIL");
		for (const error of errors) {
			console.error(`  - ${error}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-tsconfig-governance: ok");
}

const entryFile = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (
	entryFile &&
	import.meta.url === pathToFileURL(entryFile).href &&
	fileURLToPath(import.meta.url) === entryFile
) {
	main();
}
