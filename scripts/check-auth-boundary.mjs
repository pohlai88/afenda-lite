import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const AUTH_PACKAGE = "packages/control-plane/auth";
const AUTHORIZED_WORKSPACE_DEPENDENCIES = new Set([
	"@afenda/env",
	"@afenda/errors",
	"@afenda/http",
	"@afenda/logger",
	"@afenda/rate-limit",
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
const PROHIBITED_AUTH_SUBPATH =
	/from\s+["']@afenda\/auth\/(?!client["'])[^"']+["']/;
const DIRECT_NEON_RUNTIME = /from\s+["']@neondatabase\/auth(?:\/[^"']*)?["']/;
const LEGACY_ROOT_RUNTIME =
	/import\s*{[^}]*(?:getSession|requireRole|createAuthApiHandlers|createSessionProxy|inviteOrgMember|signInWithEmail|signOutSession)[^}]*}\s*from\s*["']@afenda\/auth["']/s;
const LEGACY_CLIENT_RUNTIME =
	/import\s*{[^}]*(?:getBrowserAuthClient|AUTH_[A-Z_]+|sanitizeCallbackUrl|resolvePostLoginTarget)[^}]*}\s*from\s*["']@afenda\/auth\/client["']/s;
const ORG_FALLBACK = /(?:activeOrganizationId|orgId)\s*(?:\|\||\?\?)/;
const AUTH_IMPORT = /from\s+["']@afenda\/auth(?:\/[^"']+)?["']/;

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

function checkSource(rel, source, violations) {
	if (rel.startsWith(`${AUTH_PACKAGE}/`)) {
		if (rel.includes("/src/") && source.includes("process.env")) {
			violations.push(`${rel}: raw process.env in auth owner`);
		}
		return;
	}
	if (PROHIBITED_AUTH_SUBPATH.test(source)) {
		violations.push(`${rel}: prohibited @afenda/auth implementation subpath`);
	}
	if (DIRECT_NEON_RUNTIME.test(source)) {
		violations.push(`${rel}: direct Neon Auth runtime import`);
	}
	if (LEGACY_ROOT_RUNTIME.test(source)) {
		violations.push(`${rel}: deleted root named auth runtime`);
	}
	if (LEGACY_CLIENT_RUNTIME.test(source)) {
		violations.push(`${rel}: deleted client named auth runtime`);
	}
	if (
		!rel.includes("/__tests__/") &&
		AUTH_IMPORT.test(source) &&
		ORG_FALLBACK.test(source)
	) {
		violations.push(`${rel}: consumer-owned organization fallback`);
	}
}

export function checkAuthBoundary(root) {
	const violations = [];
	const manifest = JSON.parse(
		readFileSync(join(root, AUTH_PACKAGE, "package.json"), "utf8"),
	);
	const exports = Object.keys(manifest.exports ?? {}).toSorted();
	if (JSON.stringify(exports) !== JSON.stringify([".", "./client"])) {
		violations.push(
			`${AUTH_PACKAGE}/package.json: only root and ./client exports are authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (
			dependency.startsWith("@afenda/") &&
			!AUTHORIZED_WORKSPACE_DEPENDENCIES.has(dependency)
		) {
			violations.push(
				`${AUTH_PACKAGE}/package.json: unauthorized workspace dependency ${dependency}`,
			);
		}
	}
	for (const sourceRoot of ["apps", "packages"]) {
		walk(join(root, sourceRoot), (file) => {
			if (!SOURCE_EXTENSIONS.has(extname(file))) {
				return;
			}
			const rel = posix(relative(root, file));
			checkSource(rel, readFileSync(file, "utf8"), violations);
		});
	}
	const client = readFileSync(
		join(root, AUTH_PACKAGE, "src/client.ts"),
		"utf8",
	);
	for (const forbidden of [
		"server-only",
		"@afenda/env",
		"./session",
		"./neon-auth",
		"@neondatabase/auth/next/server",
	]) {
		if (client.includes(forbidden)) {
			violations.push(
				`${AUTH_PACKAGE}/src/client.ts: browser boundary imports ${forbidden}`,
			);
		}
	}
	if (client.includes("resetBrowserAuthClientForTests")) {
		violations.push(`${AUTH_PACKAGE}/src/client.ts: test reset hook is public`);
	}
	return violations.toSorted();
}

function main() {
	const violations = checkAuthBoundary(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-auth-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-auth-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
