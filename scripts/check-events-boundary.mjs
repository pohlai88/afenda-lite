import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isGovernanceFixture } from "./lib/repository-walk.mjs";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const EVENTS_PACKAGE = "packages/data-plane/events";
const AUTHORIZED_EXPORTS = new Set([".", "./schemas"]);
const AUTHORIZED_WORKSPACE_DEPENDENCIES = new Set([
	"@afenda/db",
	"@afenda/errors",
]);
const SOURCE_EXTENSIONS = new Set([
	".cts",
	".js",
	".mjs",
	".mts",
	".ts",
	".tsx",
]);
const SKIPPED = new Set([
	".git",
	".next",
	".turbo",
	"coverage",
	"dist",
	"node_modules",
]);
const PROHIBITED_SUBPATH = /from\s+["']@afenda\/events\/(?!schemas["'])/;
const PACKAGE_HANDLER_COMPOSITION = /\bevents\.dispatcher\.create\s*\(/;
const LEGACY_SURFACES = [
	"createEventPublisher",
	"createEventDispatcher",
	"createDrizzleEventStore",
	"DrizzleEventStore",
	"queryDomainEvents",
	"purgeProcessedDomainEvents",
	"retryFailedDomainEvent",
	"replayProcessedDomainEvent",
	"generateCorrelationId",
	"generateCausationId",
];

function posix(value) {
	return value.replaceAll("\\", "/");
}

function walk(directory, visit) {
	if (!existsSync(directory)) {
		return;
	}
	for (const name of readdirSync(directory)) {
		if (SKIPPED.has(name)) {
			continue;
		}
		const file = join(directory, name);
		const stats = statSync(file);
		if (stats.isDirectory()) {
			walk(file, visit);
		} else if (stats.isFile()) {
			visit(file);
		}
	}
}

function checkConsumer(rel, source, violations) {
	if (PROHIBITED_SUBPATH.test(source)) {
		violations.push(`${rel}: prohibited @afenda/events subpath`);
	}
	if (rel.startsWith("packages/") && PACKAGE_HANDLER_COMPOSITION.test(source)) {
		violations.push(
			`${rel}: event handlers must be composed by an application`,
		);
	}
	for (const legacy of LEGACY_SURFACES) {
		if (source.includes(legacy)) {
			violations.push(`${rel}: deleted events surface ${legacy}`);
		}
	}
}

export function checkEventsBoundary(root) {
	const violations = [];
	const manifest = JSON.parse(
		readFileSync(join(root, EVENTS_PACKAGE, "package.json"), "utf8"),
	);
	const exports = Object.keys(manifest.exports ?? {});
	if (
		exports.length !== AUTHORIZED_EXPORTS.size ||
		exports.some((value) => !AUTHORIZED_EXPORTS.has(value))
	) {
		violations.push(
			`${EVENTS_PACKAGE}/package.json: only root and schemas exports are authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (
			dependency.startsWith("@afenda/") &&
			!AUTHORIZED_WORKSPACE_DEPENDENCIES.has(dependency)
		) {
			violations.push(
				`${EVENTS_PACKAGE}/package.json: unauthorized workspace dependency ${dependency}`,
			);
		}
	}
	for (const sourceRoot of ["apps", "packages", "scripts"]) {
		walk(join(root, sourceRoot), (file) => {
			if (!SOURCE_EXTENSIONS.has(extname(file))) {
				return;
			}
			const rel = posix(relative(root, file));
			if (
				rel.startsWith(`${EVENTS_PACKAGE}/`) ||
				isGovernanceFixture(rel) ||
				// The detector's own source carries every forbidden pattern as data.
				rel.startsWith("scripts/check-events-boundary")
			) {
				return;
			}
			checkConsumer(rel, readFileSync(file, "utf8"), violations);
		});
	}
	return violations.toSorted();
}

function main() {
	const violations = checkEventsBoundary(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-events-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-events-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
