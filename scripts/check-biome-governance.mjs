import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { readJsonc } from "./lib/read-jsonc.mjs";

const root = process.cwd();
const requireFromRoot = createRequire(path.join(root, "package.json"));
const rootConfigPath = path.join(root, "biome.jsonc");
const sharedConfigPath = path.join(
	root,
	"packages/foundation/config/biome.json",
);
const configPackagePath = path.join(
	root,
	"packages/foundation/config/package.json",
);
const docsProbePath = "apps/docs/tsconfig.json";
const broadDocsExclusionPattern = /^!{1,2}\*\*\/docs(?:\/\*\*)?$/;
const configPackage = JSON.parse(readFileSync(configPackagePath, "utf8"));
const biomeExport = Object.entries(configPackage.exports ?? {}).find(
	([exportPath, target]) =>
		target === "./biome.json" && exportPath.endsWith(".json"),
)?.[0];
const biomeSpecifier = biomeExport
	? `@afenda/config/${biomeExport.slice(2)}`
	: "@afenda/config/<missing-biome-export>";

const requiredExtends = [
	"ultracite/biome/core",
	"ultracite/biome/react",
	"ultracite/biome/next",
	"ultracite/biome/vitest",
	biomeSpecifier,
];

// One sentinel per required rule family. Ultracite remains the rule SSOT.
const requiredRuleSentinels = [
	"a11y/useAltText",
	"correctness/noNextAsyncClientComponent",
	"correctness/useHookAtTopLevel",
	"nursery/useSortedClasses",
	"performance/noAccumulatingSpread",
	"suspicious/noExplicitAny",
];

/** @type {string[]} */
const errors = [];

if (!biomeExport) {
	errors.push(
		"packages/foundation/config/package.json must export the shared Biome JSON artifact",
	);
}

function readConfig(file) {
	const { config, error } = readJsonc(file);
	if (error) {
		errors.push(`${path.relative(root, file)} is not valid JSONC (${error})`);
		return;
	}
	return config;
}

function sameArray(actual, expected) {
	return (
		Array.isArray(actual) &&
		actual.length === expected.length &&
		actual.every((value, index) => value === expected[index])
	);
}

function hasBroadDocsExclusion(includes) {
	if (!Array.isArray(includes)) {
		return false;
	}
	return includes.some(
		(pattern) =>
			typeof pattern === "string" && broadDocsExclusionPattern.test(pattern),
	);
}

function runBiome(args) {
	const biomeCli = requireFromRoot.resolve("@biomejs/biome/bin/biome");
	const result = spawnSync(process.execPath, [biomeCli, ...args], {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, NO_COLOR: "1" },
	});
	return {
		output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
		status: result.status,
	};
}

const rootConfig = readConfig(rootConfigPath);
const sharedConfig = readConfig(sharedConfigPath);

if (rootConfig) {
	if (!sameArray(rootConfig.extends, requiredExtends)) {
		errors.push(
			"biome.jsonc must directly extend Ultracite core/react/next/vitest, followed by @afenda/config/biome.json",
		);
	}
	if (rootConfig.files?.includes?.[0] !== "**") {
		errors.push('biome.jsonc files.includes must begin with "**"');
	}
	if (hasBroadDocsExclusion(rootConfig.files?.includes)) {
		errors.push("biome.jsonc must not exclude every directory named docs");
	}
}

if (sharedConfig) {
	if (Object.hasOwn(sharedConfig, "extends")) {
		errors.push(
			"packages/foundation/config/biome.json must contain Afenda policy only and must not extend vendor presets",
		);
	}
	if (hasBroadDocsExclusion(sharedConfig.files?.includes)) {
		errors.push(
			"packages/foundation/config/biome.json must not exclude every directory named docs",
		);
	}
}

if (existsSync(path.join(root, docsProbePath))) {
	const docsProbe = runBiome([
		"check",
		docsProbePath,
		"--verbose",
		"--max-diagnostics=1",
	]);
	if (!/Checked\s+1\s+file\b/.test(docsProbe.output)) {
		errors.push(`${docsProbePath} is not processed by the root Biome config`);
	}
} else {
	errors.push(`${docsProbePath} is missing`);
}

const rage = runBiome(["rage", "--linter", "--config-path", "biome.jsonc"]);
if (rage.status === 0) {
	for (const rule of requiredRuleSentinels) {
		if (!rage.output.includes(rule)) {
			errors.push(`effective root Biome config is missing ${rule}`);
		}
	}
} else {
	errors.push("Biome could not resolve the root linter configuration");
}

if (errors.length > 0) {
	console.error("check-biome-governance: FAIL");
	for (const error of errors) {
		console.error(`  - ${error}`);
	}
	process.exitCode = 1;
} else {
	console.log(
		"check-biome-governance: OK (direct presets, docs coverage, rule-family sentinels)",
	);
}
