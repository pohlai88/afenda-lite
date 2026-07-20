/**
 * PL-S10 — Pre-Login managed identity / write isolation.
 *
 * Anonymous and auth-entry surfaces must not reach application-owned tenancy,
 * audit, org-admin mutations, or `@afenda/db` write commands. Identity persistence
 * stays Neon Auth (provider-owned) via the BFF and Path A `auth-credentials`.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.join(webRoot, "..", "..");
const schemaRoot = path.join(
	repoRoot,
	"packages",
	"data-plane",
	"db",
	"src",
	"schema",
);
const migrateGuardPath = path.join(
	repoRoot,
	"packages",
	"data-plane",
	"db",
	"scripts",
	"db-migrate-guard.mjs",
);
const platformSchemaPath = path.join(schemaRoot, "platform.ts");
const readinessProbePath = path.join(
	repoRoot,
	"packages",
	"control-plane",
	"admin",
	"src",
	"health.ts",
);
const bffRouteRelative = "app/api/auth/[...path]/route.ts";
const PATH_A_CREDENTIALS_RELATIVE = "app/actions/auth-credentials.ts";

const PRELOGIN_ROOTS = [
	path.join(webRoot, "app", "(public)"),
	path.join(webRoot, "app", "(client)", "client", "(gate)"),
	path.join(webRoot, "app", "api", "auth"),
] as const;

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "__tests__"]);

/** Specifier → local apps/web module (not packages / node builtins). */
const LOCAL_IMPORT =
	/(?:from|import)\s*['"]((?:@\/|\.\.?\/)[^'"]+)['"]|import\s*\(\s*['"]((?:@\/|\.\.?\/)[^'"]+)['"]\s*\)/g;

/**
 * Forbidden product / app write surfaces (import path or specifier).
 * Neon Path A `@/app/actions/auth-credentials` is allowlisted (provider SDK only).
 */
const FORBIDDEN_IMPORT_SOURCE = [
	String.raw`(?:from|import)\s*['"](?:@afenda\/db(?:\/[\w.\-/]+)?|[\w./@-]*packages\/db[\w./-]*)['"]`,
	// Deny every app/actions import except auth-credentials (Neon Path A).
	String.raw`(?:from|import)\s*['"]@\/app\/actions(?!\/auth-credentials)(?:\/[^'"]*)?['"]`,
	String.raw`(?:from|import)\s*['"](?:\.\.?\/)*app\/actions(?!\/auth-credentials)(?:\/[^'"]*)?['"]`,
	String.raw`(?:from|import)\s*['"][^'"]*assign-org-role(?:-audited)?[^'"]*['"]`,
	String.raw`(?:from|import)\s*['"][^'"]*revoke-org-role(?:-audited)?[^'"]*['"]`,
	String.raw`(?:from|import)\s*['"][^'"]*invite-org-member[^'"]*['"]`,
	String.raw`(?:from|import)\s*['"][^'"]*record-rbac-audit[^'"]*['"]`,
	String.raw`(?:from|import)\s*['"]@afenda\/admin(?:\/[^'"]*)?['"]`,
	String.raw`(?:from|import)\s*['"][^'"]*platformRbacAudit[^'"]*['"]`,
	String.raw`(?:from|import)\s*['"][^'"]*platform_rbac_audit[^'"]*['"]`,
].map((source) => new RegExp(source, "g"));

/** Reachable file path segments that must never appear on the Pre-Login graph. */
const FORBIDDEN_PATH_FRAGMENT = [
	"assign-org-role",
	"revoke-org-role",
	"invite-org-member",
	"record-rbac-audit",
	"/packages/control-plane/admin/",
];

const DRIZZLE_MUTATION =
	/\.(?:insert|update|delete)\s*\(|\b(?:insert|update|delete)\s*\(\s*[\w.]*\s*,/;

function collectSourceFiles(dir: string): string[] {
	if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
		return [];
	}
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;
		const fullPath = path.join(dir, entry);
		const stats = statSync(fullPath);
		if (stats.isDirectory()) {
			files.push(...collectSourceFiles(fullPath));
		} else if (/\.(ts|tsx)$/.test(entry)) {
			files.push(fullPath);
		}
	}
	return files;
}

function toWebPath(file: string): string {
	return path.relative(webRoot, file).replace(/\\/g, "/");
}

function toRepoPath(file: string): string {
	return path.relative(repoRoot, file).replace(/\\/g, "/");
}

function isPathACredentials(relativeWebPath: string): boolean {
	return relativeWebPath === PATH_A_CREDENTIALS_RELATIVE;
}

function resolveLocalSpecifier(
	fromFile: string,
	specifier: string,
): string | null {
	let candidateBase: string;
	if (specifier.startsWith("@/")) {
		candidateBase = path.join(webRoot, specifier.slice(2));
	} else if (specifier.startsWith(".")) {
		candidateBase = path.resolve(path.dirname(fromFile), specifier);
	} else {
		return null;
	}

	const candidates = [
		candidateBase,
		`${candidateBase}.ts`,
		`${candidateBase}.tsx`,
		path.join(candidateBase, "index.ts"),
		path.join(candidateBase, "index.tsx"),
	];
	for (const candidate of candidates) {
		if (statSync(candidate, { throwIfNoEntry: false })?.isFile()) {
			const normalized = path.normalize(candidate);
			const webNorm = path.normalize(webRoot);
			if (normalized === webNorm || normalized.startsWith(webNorm + path.sep)) {
				return normalized;
			}
		}
	}
	return null;
}

function extractLocalSpecifiers(source: string): string[] {
	const specs: string[] = [];
	for (const match of source.matchAll(LOCAL_IMPORT)) {
		const specifier = match[1] ?? match[2];
		if (specifier) specs.push(specifier);
	}
	return specs;
}

function collectReachableFromRoots(roots: readonly string[]): string[] {
	const queue: string[] = [];
	for (const root of roots) {
		queue.push(...collectSourceFiles(root));
	}
	const seen = new Set<string>();
	const reachable: string[] = [];

	while (queue.length > 0) {
		const file = queue.pop();
		if (!file) break;
		const key = path.normalize(file);
		if (seen.has(key)) continue;
		seen.add(key);
		reachable.push(file);

		const source = readFileSync(file, "utf-8");
		for (const specifier of extractLocalSpecifiers(source)) {
			const resolved = resolveLocalSpecifier(file, specifier);
			if (resolved && !seen.has(path.normalize(resolved))) {
				queue.push(resolved);
			}
		}
	}

	return reachable;
}

function findForbiddenImportOffenders(files: string[]): string[] {
	const offenders: string[] = [];
	for (const file of files) {
		const relative = toWebPath(file);
		const posix = `/${relative}`;

		// Product Actions are forbidden except Neon Path A auth-credentials.
		if (posix.includes("/app/actions/") && !isPathACredentials(relative)) {
			offenders.push(`${relative} -> path:/app/actions/ (non-Path-A)`);
		}

		for (const fragment of FORBIDDEN_PATH_FRAGMENT) {
			if (posix.includes(fragment) || relative.includes(fragment)) {
				offenders.push(`${relative} -> path:${fragment}`);
			}
		}
		const source = readFileSync(file, "utf-8");
		for (const pattern of FORBIDDEN_IMPORT_SOURCE) {
			pattern.lastIndex = 0;
			for (const match of source.matchAll(pattern)) {
				offenders.push(`${relative} -> ${match[0]}`);
			}
		}
	}
	return offenders;
}

function collectPgTableNames(dir: string): string[] {
	const names: string[] = [];
	for (const file of collectSourceFiles(dir)) {
		const source = readFileSync(file, "utf-8");
		for (const match of source.matchAll(/\bpgTable\(\s*["']([^"']+)["']/g)) {
			if (match[1]) names.push(match[1]);
		}
	}
	return names;
}

describe("@afenda/web Pre-Login write isolation (PL-S10)", () => {
	it("prelogin roots exist on disk", () => {
		for (const root of PRELOGIN_ROOTS) {
			expect(
				statSync(root, { throwIfNoEntry: false })?.isDirectory(),
				`missing ${toWebPath(root)}`,
			).toBe(true);
		}
	});

	it("no product write command is reachable from prelogin route modules", () => {
		const reachable = collectReachableFromRoots(PRELOGIN_ROOTS);
		expect(reachable.length).toBeGreaterThan(0);
		expect(findForbiddenImportOffenders(reachable)).toEqual([]);
	});

	it("Path A auth-credentials is provider-owned (no app db writes)", () => {
		const reachable = collectReachableFromRoots(PRELOGIN_ROOTS);
		const credentialsFile = reachable.find(
			(file) => toWebPath(file) === PATH_A_CREDENTIALS_RELATIVE,
		);
		expect(
			credentialsFile,
			"Path A auth-credentials must be reachable from public /auth/*",
		).toBeDefined();
		const source = readFileSync(credentialsFile as string, "utf-8");
		expect(source).toMatch(/from\s*["']@afenda\/auth["']/);
		expect(source).toMatch(/signInWithEmail/);
		expect(source).toMatch(/signOutSession/);
		expect(source).not.toMatch(/signUpWithEmail/);
		expect(source).not.toMatch(/signUpAction/);
		expect(source).not.toMatch(/@afenda\/db/);
		expect(source).not.toMatch(DRIZZLE_MUTATION);
	});

	it("Auth BFF wires createAuthApiHandlers GET/POST only", () => {
		const routePath = path.join(webRoot, bffRouteRelative);
		const source = readFileSync(routePath, "utf-8");
		expect(source).toMatch(
			/import\s*\{\s*createAuthApiHandlers\s*\}\s*from\s*["']@afenda\/auth["']/,
		);
		expect(source).toMatch(
			/export\s+const\s*\{\s*GET\s*,\s*POST\s*\}\s*=\s*createAuthApiHandlers\s*\(\s*\)/,
		);
		expect(source).not.toMatch(/@afenda\/db/);
		expect(source).not.toMatch(/@\/app\/actions/);
		expect(source).not.toMatch(/@\/modules\//);
	});

	it("readiness probe remains read-only select 1", () => {
		const source = readFileSync(readinessProbePath, "utf-8");
		expect(source).toMatch(/sql`select 1`/);
		expect(source).not.toMatch(DRIZZLE_MUTATION);
	});

	it("packages/data-plane/db schema has no app-owned session or credential tables", () => {
		const tableNames = collectPgTableNames(schemaRoot);
		expect(tableNames.length).toBeGreaterThan(0);
		const offenders = tableNames.filter(
			(name) =>
				/(?:^|_)session(?:_|$)/.test(name) ||
				/(?:^|_)credential(?:s)?(?:_|$)/.test(name) ||
				name === "app_session" ||
				name === "user_credentials" ||
				name === "local_credentials",
		);
		expect(offenders).toEqual([]);
	});

	it("documents Neon Auth tables as provider-owned (not app migration targets)", () => {
		const source = readFileSync(platformSchemaPath, "utf-8");
		expect(source).toMatch(/neon_auth/);
		expect(source).toMatch(/not duplicated/i);
	});

	it("preserves production baseline migrate guard (PL-S9)", () => {
		expect(existsSync(migrateGuardPath)).toBe(true);
		expect(toRepoPath(migrateGuardPath)).toBe(
			"packages/data-plane/db/scripts/db-migrate-guard.mjs",
		);
	});
});
