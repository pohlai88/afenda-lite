#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { lstatSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_DIRECTORY_NAMES = new Set([
	".next",
	".playwright-cli",
	".source",
	".tmp",
	".turbo",
	"build",
	"coverage",
	"dist",
	"node_modules",
	"playwright-report",
	"storybook-static",
	"test-results",
]);

const PROTECTED_PATH_PREFIXES = [
	".git",
	".vercel",
	"_reference",
	"apps/web/shadcn-studio",
];

const USAGE = "Usage: node scripts/clean-workspace-noise.mjs [--apply]";

function normalizeRelativePath(value) {
	return value.split(path.sep).join("/");
}

function relativeFromRoot(root, absolutePath) {
	const relativePath = path.relative(root, absolutePath);
	return normalizeRelativePath(relativePath) || ".";
}

function isProtectedPath(relativePath) {
	if (relativePath === ".") {
		return false;
	}

	if (relativePath.startsWith("..")) {
		return true;
	}

	if (path.basename(relativePath) === "next-env.d.ts") {
		return true;
	}

	if (
		relativePath.startsWith(".env") ||
		relativePath.split("/").some((segment) => segment.startsWith(".env"))
	) {
		return true;
	}

	return PROTECTED_PATH_PREFIXES.some(
		(prefix) =>
			relativePath === prefix || relativePath.startsWith(`${prefix}/`),
	);
}

function isAllowedNoisePath(relativePath, stats) {
	const basename = path.basename(relativePath);

	if (stats.isDirectory()) {
		return ALLOWED_DIRECTORY_NAMES.has(basename);
	}

	return basename.endsWith(".tsbuildinfo") || basename.endsWith(".log");
}

function isGitIgnored(root, relativePath, stats) {
	const checkPath =
		stats.isDirectory() && !relativePath.endsWith("/")
			? `${relativePath}/`
			: relativePath;
	const result = spawnSync("git", ["check-ignore", "-q", "--", checkPath], {
		cwd: root,
		stdio: "ignore",
	});

	return result.status === 0;
}

export function collectWorkspaceNoise(root = process.cwd()) {
	const resolvedRoot = path.resolve(root);
	const candidates = [];

	function visit(absolutePath) {
		const relativePath = relativeFromRoot(resolvedRoot, absolutePath);

		if (isProtectedPath(relativePath)) {
			return;
		}

		let stats;
		try {
			stats = lstatSync(absolutePath);
		} catch {
			return;
		}

		if (
			isAllowedNoisePath(relativePath, stats) &&
			isGitIgnored(resolvedRoot, relativePath, stats)
		) {
			candidates.push({
				path: relativePath,
				type: stats.isDirectory() ? "directory" : "file",
			});
			return;
		}

		if (!stats.isDirectory()) {
			return;
		}

		for (const entry of readdirSync(absolutePath)) {
			visit(path.join(absolutePath, entry));
		}
	}

	visit(resolvedRoot);

	return candidates.sort((left, right) => left.path.localeCompare(right.path));
}

function parseArgs(argv) {
	if (argv.length === 0) {
		return { apply: false };
	}

	if (argv.length === 1 && argv[0] === "--apply") {
		return { apply: true };
	}

	throw new Error(USAGE);
}

function assertInsideRoot(root, relativePath) {
	const resolvedRoot = path.resolve(root);
	const resolvedTarget = path.resolve(resolvedRoot, relativePath);
	const relativeTarget = path.relative(resolvedRoot, resolvedTarget);

	if (
		relativeTarget === "" ||
		relativeTarget.startsWith("..") ||
		path.isAbsolute(relativeTarget)
	) {
		throw new Error(
			`Refusing to remove path outside workspace: ${relativePath}`,
		);
	}

	return resolvedTarget;
}

export function runWorkspaceNoiseCleanup({
	root = process.cwd(),
	apply = false,
} = {}) {
	const resolvedRoot = path.resolve(root);
	const candidates = collectWorkspaceNoise(resolvedRoot);

	for (const candidate of candidates) {
		if (!apply) {
			continue;
		}

		const absolutePath = assertInsideRoot(resolvedRoot, candidate.path);
		rmSync(absolutePath, {
			force: true,
			maxRetries: 3,
			recursive: candidate.type === "directory",
			retryDelay: 100,
		});
	}

	return {
		apply,
		count: candidates.length,
		paths: candidates.map((candidate) => candidate.path),
	};
}

function printReport(report) {
	const action = report.apply ? "Removed" : "Would remove";

	console.log(
		`clean-workspace-noise: ${report.apply ? "apply" : "dry-run"} (${report.count} path${report.count === 1 ? "" : "s"})`,
	);

	for (const targetPath of report.paths) {
		console.log(`${action} ${targetPath}`);
	}
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const report = runWorkspaceNoiseCleanup(args);
	printReport(report);
}

const isCli = process.argv[1]
	? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
	: false;

if (isCli) {
	try {
		main();
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
