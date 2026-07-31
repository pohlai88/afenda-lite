#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const EXCLUDED_DIRECTORIES = new Set([
	".git",
	".next",
	".turbo",
	"coverage",
	"dist",
	"node_modules",
]);
const EXCLUDED_FILES = new Set([".env", ".env.local"]);
const EXCLUDED_SUFFIXES = [".tsbuildinfo"];

function fail(message) {
	process.stderr.write(`afenda-elite-kernel: ${message}\n`);
	process.exit(1);
}

function repositoryRoot() {
	const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		encoding: "utf8",
	});
	if (result.status !== 0) {
		fail("run the inspector inside a Git repository");
	}
	return resolve(result.stdout.trim());
}

function isWithin(parent, candidate) {
	const pathFromParent = relative(parent, candidate);
	return (
		pathFromParent === "" ||
		(!pathFromParent.startsWith(`..${sep}`) && pathFromParent !== "..")
	);
}

function shouldExclude(name, isDirectory) {
	if (isDirectory) {
		return EXCLUDED_DIRECTORIES.has(name);
	}
	return (
		EXCLUDED_FILES.has(name) ||
		name.startsWith(".env.") ||
		EXCLUDED_SUFFIXES.some((suffix) => name.endsWith(suffix))
	);
}

function collectFiles(root, current = root) {
	const files = [];
	for (const entry of readdirSync(current, { withFileTypes: true })) {
		if (shouldExclude(entry.name, entry.isDirectory())) {
			continue;
		}
		const absolutePath = resolve(current, entry.name);
		if (entry.isDirectory()) {
			files.push(...collectFiles(root, absolutePath));
			continue;
		}
		if (entry.isFile()) {
			files.push(relative(root, absolutePath).replaceAll("\\", "/"));
		}
	}
	return files.toSorted();
}

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

function readPackageJson(target) {
	const packagePath = resolve(target, "package.json");
	if (!existsSync(packagePath)) {
		return null;
	}
	const parsed = JSON.parse(readFileSync(packagePath, "utf8"));
	const dependencyGroups = [
		"dependencies",
		"devDependencies",
		"peerDependencies",
		"optionalDependencies",
	];
	return {
		name: parsed.name ?? null,
		private: parsed.private ?? null,
		type: parsed.type ?? null,
		exports: parsed.exports ?? null,
		scripts: Object.fromEntries(
			Object.entries(parsed.scripts ?? {}).toSorted(([left], [right]) =>
				left.localeCompare(right),
			),
		),
		dependencies: Object.fromEntries(
			dependencyGroups.map((group) => [
				group,
				Object.keys(parsed[group] ?? {}).toSorted(),
			]),
		),
	};
}

function targetGitChanges(repoRoot, targetFromRepo) {
	const result = spawnSync(
		"git",
		["status", "--short", "--untracked-files=all", "--", targetFromRepo],
		{ cwd: repoRoot, encoding: "utf8" },
	);
	if (result.status !== 0) {
		fail("could not read target working-tree state");
	}
	return result.stdout
		.split(/\r?\n/)
		.map((line) => line.trimEnd())
		.filter(Boolean);
}

function inspectDirectory(repoRoot, target) {
	const targetFromRepo = relative(repoRoot, target).replaceAll("\\", "/");
	const files = collectFiles(target);
	const fileRecords = files.map((path) => {
		const bytes = readFileSync(resolve(target, path));
		return { path, bytes: bytes.length, sha256: sha256(bytes) };
	});
	const digestInput = fileRecords
		.map((file) => `${file.path}\0${file.bytes}\0${file.sha256}`)
		.join("\n");
	const gitChanges = targetGitChanges(repoRoot, targetFromRepo);

	return {
		target: targetFromRepo,
		contentDigest: sha256(digestInput),
		package: readPackageJson(target),
		summary: {
			fileCount: fileRecords.length,
			sourceFileCount: files.filter((path) => path.startsWith("src/")).length,
			testFileCount: files.filter((path) =>
				/(^|\/)(__tests__|testing)(\/|$)|\.(test|spec)\.[^.]+$/.test(path),
			).length,
			hasReadme: files.some((path) => path.toLowerCase() === "readme.md"),
			hasTsconfig: files.some((path) => path === "tsconfig.json"),
		},
		workingTree: {
			state: gitChanges.length === 0 ? "clean" : "dirty",
			changes: gitChanges,
		},
		files: fileRecords,
	};
}

function immediateChildPackages(repoRoot, target) {
	return readdirSync(target, { withFileTypes: true })
		.filter(
			(entry) =>
				entry.isDirectory() &&
				!shouldExclude(entry.name, true) &&
				existsSync(resolve(target, entry.name, "package.json")),
		)
		.map((entry) => inspectDirectory(repoRoot, resolve(target, entry.name)))
		.toSorted((left, right) => left.target.localeCompare(right.target));
}

const [targetArgument, ...extraArguments] = process.argv.slice(2);
if (targetArgument === undefined || extraArguments.length > 0) {
	fail("usage: inspect-target.mjs <repository-relative-target>");
}

const repoRoot = repositoryRoot();
const target = resolve(repoRoot, targetArgument);
if (!isWithin(repoRoot, target)) {
	fail("target must stay inside the repository");
}
if (!(existsSync(target) && statSync(target).isDirectory())) {
	fail(`target directory does not exist: ${targetArgument}`);
}

const inspectedTarget = inspectDirectory(repoRoot, target);

const report = {
	snapshotVersion: 2,
	...inspectedTarget,
	childPackages: immediateChildPackages(repoRoot, target).map(
		({ files: _files, ...childPackage }) => childPackage,
	),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
