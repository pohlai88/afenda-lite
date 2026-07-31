import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const NOTIFICATIONS_PACKAGE = "packages/data-plane/notifications";
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
const PROHIBITED_SUBPATH = /from\s+["']@afenda\/notifications\//;
const NOTIFICATIONS_IMPORT = /from\s+["']@afenda\/notifications["']/;
const NOTIFICATIONS_NAMED_IMPORT =
	/import\s*{(?<names>[^}]*)}\s*from\s*["']@afenda\/notifications(?:\/[^"']+)?["']/g;
const RAW_VOCABULARY =
	/\b(?:channel|priority|type)\s*:\s*["'`](?:IN_APP|LOW|MEDIUM|HIGH|URGENT|INFO|WARNING|ERROR|SUCCESS|ACTION_REQUIRED)["'`]/;
const DIRECT_TABLE = /\b(?:platformNotification|platform_notification)\b/;
const TEST_FILE = /(?:^|\/)[^/]+\.(?:test|spec)\.[^.]+$/;
const LEGACY_SURFACES = [
	"NotificationStore",
	"DrizzleNotificationStore",
	"createDrizzleNotificationStore",
	"createNotificationRecorder",
	"listNotifications",
	"countUnreadNotifications",
	"markNotificationRead",
	"markAllNotificationsRead",
	"deleteNotification",
	"purgeExpiredNotifications",
	"recordNotificationCommandSchema",
	"MAX_NOTIFICATION_PAGE_SIZE",
];

function posix(value) {
	return value.replaceAll("\\", "/");
}
function isTestFile(rel) {
	return rel.includes("/__tests__/") || TEST_FILE.test(rel);
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
		violations.push(`${rel}: prohibited @afenda/notifications subpath`);
	}
	if (
		!isTestFile(rel) &&
		NOTIFICATIONS_IMPORT.test(source) &&
		RAW_VOCABULARY.test(source)
	) {
		violations.push(`${rel}: consumer owns notification vocabulary`);
	}
	if (
		!isTestFile(rel) &&
		(rel.startsWith("apps/") || rel.startsWith("packages/")) &&
		DIRECT_TABLE.test(source)
	) {
		violations.push(`${rel}: direct platform_notification access`);
	}
	for (const match of source.matchAll(NOTIFICATIONS_NAMED_IMPORT)) {
		const names = match.groups?.names ?? "";
		for (const legacy of LEGACY_SURFACES) {
			if (names.includes(legacy)) {
				violations.push(`${rel}: deleted notifications surface ${legacy}`);
			}
		}
	}
}

export function checkNotificationsBoundary(root) {
	const violations = [];
	const manifest = JSON.parse(
		readFileSync(join(root, NOTIFICATIONS_PACKAGE, "package.json"), "utf8"),
	);
	const exports = Object.keys(manifest.exports ?? {});
	if (exports.length !== 1 || exports[0] !== ".") {
		violations.push(
			`${NOTIFICATIONS_PACKAGE}/package.json: only the root export is authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (
			dependency.startsWith("@afenda/") &&
			!AUTHORIZED_WORKSPACE_DEPENDENCIES.has(dependency)
		) {
			violations.push(
				`${NOTIFICATIONS_PACKAGE}/package.json: unauthorized workspace dependency ${dependency}`,
			);
		}
	}
	walk(join(root, NOTIFICATIONS_PACKAGE, "src"), (file) => {
		if (
			SOURCE_EXTENSIONS.has(extname(file)) &&
			readFileSync(file, "utf8").includes("@afenda/events")
		) {
			violations.push(
				`${posix(relative(root, file))}: event interpretation belongs at the application composition root`,
			);
		}
	});
	for (const sourceRoot of ["apps", "packages", "scripts"]) {
		walk(join(root, sourceRoot), (file) => {
			if (!SOURCE_EXTENSIONS.has(extname(file))) {
				return;
			}
			const rel = posix(relative(root, file));
			if (
				rel.startsWith(`${NOTIFICATIONS_PACKAGE}/`) ||
				rel.startsWith("packages/data-plane/db/") ||
				rel.startsWith("scripts/check-notifications-boundary")
			) {
				return;
			}
			checkConsumer(rel, readFileSync(file, "utf8"), violations);
		});
	}
	return violations.toSorted();
}

function main() {
	const violations = checkNotificationsBoundary(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-notifications-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-notifications-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
