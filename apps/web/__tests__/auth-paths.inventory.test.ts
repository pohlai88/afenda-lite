/**
 * PL-S1 — Pre-Login route inventory vs typed contract.
 * Fails when a public/gate page is added without updating the allowlist.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { authBrowser } from "@afenda/auth/client";
import { describe, expect, it } from "vitest";

import {
	CLIENT_DASHBOARD_ALIAS_PATH,
	CLIENT_DASHBOARD_PATH,
	CLIENT_GATE_PATHS,
} from "../features/auth/client-paths";
import {
	HEALTH_LIVENESS_PATH,
	HEALTH_READINESS_PATH,
	METRICS_SCRAPE_PATH,
	POST_LOGIN_PATHS_NOT_PUBLIC,
	PRE_LOGIN_API_PATHS,
	PRE_LOGIN_GATE_BYPASS_PATHS,
	PRE_LOGIN_PUBLIC_ROUTE_PATHS,
	SESSION_GATE_PROTECTED_MATCHERS,
} from "../features/auth/pre-login-route-contract";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicAppRoot = path.join(webRoot, "app", "(public)");
const gateAppRoot = path.join(webRoot, "app", "(client)", "client", "(gate)");
const nextConfigPath = path.join(webRoot, "next.config.ts");
const proxyPath = path.join(webRoot, "proxy.ts");

const DYNAMIC_AUTH_PAGE = `${authBrowser.paths.base}/[path]` as const;

/** Relative page.tsx paths under a route group → URL pathnames. */
function collectPageUrls(appRoot: string, urlPrefix = ""): string[] {
	const urls: string[] = [];

	function walk(dir: string, segments: string[]): void {
		if (!existsSync(dir)) {
			return;
		}
		for (const entry of readdirSync(dir)) {
			const full = path.join(dir, entry);
			if (statSync(full).isDirectory()) {
				// Route-group folders do not appear in the URL.
				if (entry.startsWith("(") && entry.endsWith(")")) {
					walk(full, segments);
					continue;
				}
				walk(full, [...segments, entry]);
				continue;
			}
			if (entry !== "page.tsx") {
				continue;
			}
			if (segments.length === 0) {
				urls.push(urlPrefix || "/");
				continue;
			}
			urls.push(`${urlPrefix}/${segments.join("/")}`);
		}
	}

	walk(appRoot, []);
	return [...urls].sort((a, b) => a.localeCompare(b));
}

function apiRouteFile(apiPath: string): string {
	if (apiPath === authBrowser.paths.apiBase) {
		return path.join(webRoot, "app", "api", "auth", "[...path]", "route.ts");
	}
	const relative = apiPath.replace(/^\//, "");
	return path.join(webRoot, "app", ...relative.split("/"), "route.ts");
}

describe("PL-S1 Pre-Login route inventory", () => {
	it("pins web public class to @afenda/auth PRE_LOGIN_PUBLIC_PATHS", () => {
		expect([...PRE_LOGIN_PUBLIC_ROUTE_PATHS]).toEqual([
			...authBrowser.paths.preLoginPublic,
		]);
	});

	it("keeps PUBLIC_AUTH_FULL_PATHS aligned with PUBLIC_AUTH_PATHS segments", () => {
		expect(authBrowser.paths.publicAuth).toHaveLength(
			authBrowser.paths.publicSegments.length,
		);
		for (const [index, segment] of authBrowser.paths.publicSegments.entries()) {
			expect(authBrowser.paths.publicAuth[index]).toBe(
				`${authBrowser.paths.base}/${segment}`,
			);
		}
	});

	it("pins gate bypass class to CLIENT_GATE_PATHS", () => {
		expect([...PRE_LOGIN_GATE_BYPASS_PATHS]).toEqual([...CLIENT_GATE_PATHS]);
	});

	it("keeps every static (public) page.tsx inside the public allowlist", () => {
		const diskUrls = collectPageUrls(publicAppRoot);
		const staticUrls = diskUrls.filter((url) => url !== DYNAMIC_AUTH_PAGE);

		for (const url of staticUrls) {
			expect(
				authBrowser.paths.isPreLoginPublic(url),
				`undeclared public page on disk: ${url}`,
			).toBe(true);
		}

		expect(diskUrls).toContain(DYNAMIC_AUTH_PAGE);
		for (const fullPath of authBrowser.paths.publicAuth) {
			expect(authBrowser.paths.isPreLoginPublic(fullPath)).toBe(true);
		}
		for (const segment of authBrowser.paths.publicSegments) {
			expect(authBrowser.paths.isPublicAuth(segment)).toBe(true);
		}
	});

	it("fails closed when public allowlist entries lack disk pages", () => {
		const diskUrls = new Set(collectPageUrls(publicAppRoot));
		const expectedStatic = authBrowser.paths.preLoginPublic.filter(
			(url) => !url.startsWith(`${authBrowser.paths.base}/`),
		);
		for (const url of expectedStatic) {
			expect(diskUrls.has(url), `missing public page for ${url}`).toBe(true);
		}
		expect(diskUrls.has(DYNAMIC_AUTH_PAGE)).toBe(true);
	});

	it("maps every client gate page.tsx 1:1 to CLIENT_GATE_PATHS", () => {
		const diskUrls = collectPageUrls(gateAppRoot, "/client");
		expect(diskUrls).toEqual(
			[...CLIENT_GATE_PATHS].sort((a, b) => a.localeCompare(b)),
		);
	});

	it("ships Route Handlers for every Pre-Login API path", () => {
		expect(PRE_LOGIN_API_PATHS).toEqual([
			authBrowser.paths.apiBase,
			HEALTH_LIVENESS_PATH,
			HEALTH_READINESS_PATH,
			METRICS_SCRAPE_PATH,
		]);
		const missing = PRE_LOGIN_API_PATHS.filter(
			(apiPath) => !existsSync(apiRouteFile(apiPath)),
		);
		expect(missing).toEqual([]);
	});

	it("declares accept-invitation redirect in next.config (not a public page)", () => {
		expect(
			authBrowser.paths.isPreLoginPublic(authBrowser.paths.acceptInvitation),
		).toBe(false);
		const nextConfig = readFileSync(nextConfigPath, "utf8");
		expect(nextConfig).toContain("AUTH_ACCEPT_INVITATION_PATH");
		expect(nextConfig).toContain("JOIN_PATH");
		expect(nextConfig).toContain("packages/control-plane/auth/src/auth-paths");
		expect(nextConfig).toContain("packages/control-plane/auth/src/join-paths");
		expect(nextConfig).toContain("invitationId=:invitationId");
		expect(nextConfig).toContain("permanent: true");
		// next.config must pin the same literals as package SSOT (CJS-safe; no .ts import).
		expect(authBrowser.paths.acceptInvitation).toBe("/auth/accept-invitation");
		expect(authBrowser.paths.join.path).toBe("/join");
		expect(nextConfig).toContain(`"${authBrowser.paths.acceptInvitation}"`);
		expect(nextConfig).toContain(`"${authBrowser.paths.join.path}"`);
	});

	it("keeps proxy config.matcher static and equal to SESSION_GATE_PROTECTED_MATCHERS", () => {
		const proxySource = readFileSync(proxyPath, "utf8");
		// Next.js requires compile-time static matcher literals (no imported spreads).
		expect(proxySource).not.toContain("[...SESSION_GATE_PROTECTED_MATCHERS]");
		const configBlock = proxySource.match(
			/export const config = \{[\s\S]*?matcher:\s*\[([\s\S]*?)\]/,
		);
		expect(configBlock).not.toBeNull();
		const matcherLiterals = [
			...(configBlock?.[1] ?? "").matchAll(/"([^"]+)"/g),
		].map((match) => match[1]);
		expect(matcherLiterals).toEqual([...SESSION_GATE_PROTECTED_MATCHERS]);
	});

	it("keeps every Pre-Login API path outside SESSION_GATE_PROTECTED_MATCHERS", () => {
		for (const apiPath of PRE_LOGIN_API_PATHS) {
			const matched = SESSION_GATE_PROTECTED_MATCHERS.some((matcher) => {
				const prefix = matcher.replace(/\/:path\*$/, "");
				return apiPath === prefix || apiPath.startsWith(`${prefix}/`);
			});
			expect(
				matched,
				`${apiPath} must stay outside the session-gate matcher`,
			).toBe(false);
		}
	});

	it("never classifies post-login homes as public", () => {
		for (const postLogin of POST_LOGIN_PATHS_NOT_PUBLIC) {
			expect(authBrowser.paths.isPreLoginPublic(postLogin)).toBe(false);
			expect(authBrowser.paths.preLoginPublic).not.toContain(postLogin);
		}
		expect(authBrowser.paths.isPreLoginPublic(CLIENT_DASHBOARD_PATH)).toBe(
			false,
		);
		expect(
			authBrowser.paths.isPreLoginPublic(CLIENT_DASHBOARD_ALIAS_PATH),
		).toBe(false);
	});

	it("rejects undeclared sign-in alias (not AUTH_LOGIN_PATH)", () => {
		const [rejectedSignIn] = authBrowser.paths.rejectedAliases;
		expect(rejectedSignIn).not.toBe(authBrowser.paths.login);
		expect(authBrowser.paths.isRejectedAlias(rejectedSignIn)).toBe(true);
		expect(authBrowser.paths.isPreLoginPublic(rejectedSignIn)).toBe(false);
		expect(authBrowser.paths.isPublicAuth("sign-in")).toBe(false);
	});

	it("does not place gate bypass paths in the public document allowlist", () => {
		for (const gatePath of CLIENT_GATE_PATHS) {
			expect(authBrowser.paths.isPreLoginPublic(gatePath)).toBe(false);
		}
	});
});
