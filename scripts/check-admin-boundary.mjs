import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const ADMIN_PACKAGE = "packages/control-plane/admin";
const AUTHORIZED_WORKSPACE_DEPENDENCIES = new Set([
	"@afenda/auth",
	"@afenda/db",
	"@afenda/env",
	"@afenda/errors",
]);
const SOURCE_EXTENSIONS = new Set([
	".cts",
	".js",
	".jsx",
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
const PROHIBITED_SUBPATH =
	/from\s+["']@afenda\/admin\/(?!audit["']|health["'])[^"']+["']/;
const LEGACY_RUNTIME_IMPORT =
	/import\s*{[^}]*(?:listOrganizations|provisionOrganization|deleteOrganization|getOrganizationUsageMetrics|recordRbacAudit|listRbacAudit|getLivenessSnapshot|getReadinessSnapshot)[^}]*}\s*from\s*["']@afenda\/admin(?:\/[^"']+)?["']/s;
const RBAC_TABLE_ACCESS =
	/\b(?:platformRbacAudit|INSERT\s+INTO\s+platform_rbac_audit|FROM\s+platform_rbac_audit|UPDATE\s+platform_rbac_audit|DELETE\s+FROM\s+platform_rbac_audit)\b/i;
const DIRECT_NEON_AUTH = /from\s+["']@neondatabase\/auth(?:\/[^"']*)?["']/;
const TEST_FILE = /(?:^|\/)(?:__tests__\/|[^/]+\.(?:test|spec)\.)/;

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
		violations.push(`${rel}: prohibited @afenda/admin subpath`);
	}
	if (LEGACY_RUNTIME_IMPORT.test(source)) {
		violations.push(`${rel}: deleted standalone admin runtime`);
	}
	if (!TEST_FILE.test(rel) && RBAC_TABLE_ACCESS.test(source)) {
		violations.push(`${rel}: direct platform_rbac_audit interpretation`);
	}
}

export function checkAdminBoundary(root) {
	const violations = [];
	const manifest = JSON.parse(
		readFileSync(join(root, ADMIN_PACKAGE, "package.json"), "utf8"),
	);
	const exports = Object.keys(manifest.exports ?? {}).toSorted();
	if (
		JSON.stringify(exports) !== JSON.stringify([".", "./audit", "./health"])
	) {
		violations.push(
			`${ADMIN_PACKAGE}/package.json: only root, ./audit and ./health exports are authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (
			dependency.startsWith("@afenda/") &&
			!AUTHORIZED_WORKSPACE_DEPENDENCIES.has(dependency)
		) {
			violations.push(
				`${ADMIN_PACKAGE}/package.json: unauthorized workspace dependency ${dependency}`,
			);
		}
	}
	walk(join(root, ADMIN_PACKAGE, "src"), (file) => {
		if (!SOURCE_EXTENSIONS.has(extname(file))) {
			return;
		}
		const rel = posix(relative(root, file));
		const source = readFileSync(file, "utf8");
		if (DIRECT_NEON_AUTH.test(source)) {
			violations.push(`${rel}: admin owns no Neon Auth client`);
		}
		if (source.includes("@afenda/audit")) {
			violations.push(
				`${rel}: general audit and RBAC audit must remain distinct`,
			);
		}
	});
	for (const sourceRoot of ["apps", "packages"]) {
		walk(join(root, sourceRoot), (file) => {
			if (!SOURCE_EXTENSIONS.has(extname(file))) {
				return;
			}
			const rel = posix(relative(root, file));
			if (
				rel.startsWith(`${ADMIN_PACKAGE}/`) ||
				rel.startsWith("packages/data-plane/db/")
			) {
				return;
			}
			checkConsumer(rel, readFileSync(file, "utf8"), violations);
		});
	}
	const rootEntry = readFileSync(
		join(root, ADMIN_PACKAGE, "src/index.ts"),
		"utf8",
	);
	if (!(rootEntry.includes("authServer") || rootEntry.includes("admin"))) {
		violations.push(
			`${ADMIN_PACKAGE}/src/index.ts: root admin capability missing`,
		);
	}
	for (const legacy of [
		"listOrganizations",
		"recordRbacAudit",
		"getLivenessSnapshot",
	]) {
		if (rootEntry.includes(legacy)) {
			violations.push(
				`${ADMIN_PACKAGE}/src/index.ts: isolated or legacy runtime ${legacy}`,
			);
		}
	}
	return violations.toSorted();
}

function main() {
	const violations = checkAdminBoundary(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-admin-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-admin-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
