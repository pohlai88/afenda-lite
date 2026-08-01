#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function fail(message) {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

function parseArguments(argv) {
	const [targetArgument, ...rest] = argv;
	if (!targetArgument) {
		fail(
			"Usage: inspect-semantic-surface.mjs <package-path> [--semantic-prefix prefix] [--broad-symbol symbol]",
		);
	}

	let semanticPrefix;
	const broadSymbols = [];
	for (let index = 0; index < rest.length; index += 1) {
		const argument = rest[index];
		const value = rest[index + 1];
		if (argument === "--semantic-prefix" && value) {
			semanticPrefix = value;
			index += 1;
			continue;
		}
		if (argument === "--broad-symbol" && value) {
			broadSymbols.push(value);
			index += 1;
			continue;
		}
		fail(`Unknown or incomplete argument: ${argument}`);
	}
	return { targetArgument, semanticPrefix, broadSymbols };
}

function listFiles(root) {
	return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		if (["node_modules", ".git", ".turbo"].includes(entry.name)) return [];
		const absolute = path.join(root, entry.name);
		if (entry.isDirectory()) return listFiles(absolute);
		return statSync(absolute).isFile() ? [absolute] : [];
	});
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const { targetArgument, semanticPrefix, broadSymbols } = parseArguments(
	process.argv.slice(2),
);
const repositoryRoot = process.cwd();
const targetRoot = path.resolve(repositoryRoot, targetArgument);
const packageJsonPath = path.join(targetRoot, "package.json");

if (!existsSync(packageJsonPath)) {
	fail(`Target package.json not found: ${packageJsonPath}`);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const targetFiles = listFiles(targetRoot);
const sourceFiles = targetFiles.filter((file) => /[\\/]src[\\/].+\.[cm]?[jt]sx?$/.test(file));
const testFiles = targetFiles.filter((file) => /[\\/](?:__tests__|testing)[\\/].+\.[cm]?[jt]sx?$/.test(file));
const registryCandidates = sourceFiles
	.filter((file) =>
		/(?:registry|catalog|manifest|module-ids|permissions|polic|serialization|effective-truth)/i.test(
			path.basename(file),
		),
	)
	.map((file) => path.relative(repositoryRoot, file).replaceAll("\\", "/"))
	.toSorted();

const broadSymbolReferences = Object.fromEntries(
	broadSymbols.map((symbol) => {
		const expression = new RegExp(`\\b${escapeRegExp(symbol)}\\b`);
		const files = sourceFiles
			.filter((file) => expression.test(readFileSync(file, "utf8")))
			.map((file) => path.relative(repositoryRoot, file).replaceAll("\\", "/"))
			.toSorted();
		return [symbol, { count: files.length, files }];
	}),
);

const semanticLiterals = {};
if (semanticPrefix) {
	const expression = new RegExp(
		`["'](${escapeRegExp(semanticPrefix)}(?:\\.[a-z0-9-]+)+)["']`,
		"g",
	);
	for (const file of sourceFiles) {
		const relative = path.relative(repositoryRoot, file).replaceAll("\\", "/");
		for (const match of readFileSync(file, "utf8").matchAll(expression)) {
			const literal = match[1];
			if (!literal) continue;
			semanticLiterals[literal] ??= new Set();
			semanticLiterals[literal].add(relative);
		}
	}
}

const repeatedSemanticLiterals = Object.entries(semanticLiterals)
	.map(([literal, files]) => ({ literal, fileCount: files.size, files: [...files].toSorted() }))
	.filter((entry) => entry.fileCount > 1)
	.toSorted((left, right) => right.fileCount - left.fileCount || left.literal.localeCompare(right.literal));

const packageName = packageJson.name;
const repositoryFiles = listFiles(repositoryRoot).filter((file) =>
	/\.(?:[cm]?[jt]sx?|mdx)$/.test(file),
);
const consumerFiles = typeof packageName === "string"
	? repositoryFiles
		.filter((file) => !file.startsWith(`${targetRoot}${path.sep}`))
		.filter((file) => readFileSync(file, "utf8").includes(packageName))
		.map((file) => path.relative(repositoryRoot, file).replaceAll("\\", "/"))
		.toSorted()
	: [];

const result = {
	target: path.relative(repositoryRoot, targetRoot).replaceAll("\\", "/"),
	packageName: packageName ?? null,
	exports: Object.keys(packageJson.exports ?? {}).toSorted(),
	sourceFileCount: sourceFiles.length,
	testFileCount: testFiles.length,
	consumerFileCount: consumerFiles.length,
	consumerFiles,
	registryCandidates,
	broadSymbolReferences,
	repeatedSemanticLiterals,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
