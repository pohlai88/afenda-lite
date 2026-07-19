import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { shouldBypassSessionGate } from "../session-gate-policy";

function req(partial: {
	method?: string;
	pathname: string;
	search?: Record<string, string>;
	headers?: string[];
	playgroundEnabled?: boolean;
}) {
	const searchParams = new URLSearchParams(partial.search);
	const headerSet = new Set(
		(partial.headers ?? []).map((name) => name.toLowerCase()),
	);

	return {
		method: partial.method ?? "GET",
		pathname: partial.pathname,
		searchParams,
		hasHeader: (name: string) => headerSet.has(name.toLowerCase()),
		playgroundEnabled: partial.playgroundEnabled,
	};
}

function readProxySource(): string {
	return readFileSync(resolve(import.meta.dirname, "../proxy.ts"), "utf8");
}

describe("shouldBypassSessionGate", () => {
	it("does not bypass ordinary protected GET navigations (fail closed)", () => {
		for (const pathname of [
			"/admin",
			"/admin/users",
			"/client",
			"/client/dashboard",
			"/dashboard",
			"/account",
		]) {
			expect(shouldBypassSessionGate(req({ pathname }))).toBe(false);
		}
	});

	it("bypasses Server Actions only when method is POST with next-action", () => {
		expect(
			shouldBypassSessionGate(
				req({
					method: "POST",
					pathname: "/admin",
					headers: ["next-action"],
				}),
			),
		).toBe(true);

		expect(
			shouldBypassSessionGate(
				req({
					method: "GET",
					pathname: "/admin",
					headers: ["next-action"],
				}),
			),
		).toBe(false);
	});

	it("bypasses ARCH-012 embed and client public prefixes", () => {
		expect(
			shouldBypassSessionGate(
				req({ pathname: "/admin", search: { embed: "1" } }),
			),
		).toBe(true);

		expect(shouldBypassSessionGate(req({ pathname: "/client/login" }))).toBe(
			true,
		);
		expect(
			shouldBypassSessionGate(req({ pathname: "/client/preview-unavailable" })),
		).toBe(true);
	});

	it("bypasses Pre-Login API surfaces (auth BFF + health + metrics)", () => {
		expect(shouldBypassSessionGate(req({ pathname: "/api/auth" }))).toBe(true);
		expect(
			shouldBypassSessionGate(req({ pathname: "/api/auth/get-session" })),
		).toBe(true);
		expect(
			shouldBypassSessionGate(req({ pathname: "/api/health/liveness" })),
		).toBe(true);
		expect(
			shouldBypassSessionGate(req({ pathname: "/api/health/readiness" })),
		).toBe(true);
		expect(shouldBypassSessionGate(req({ pathname: "/api/metrics" }))).toBe(
			true,
		);
		// Post-login APIs stay fail-closed at the policy layer.
		expect(
			shouldBypassSessionGate(req({ pathname: "/api/session/sync-cookies" })),
		).toBe(false);
	});

	it("bypasses playground paths only when the harness flag is enabled", () => {
		expect(shouldBypassSessionGate(req({ pathname: "/playground" }))).toBe(
			false,
		);
		expect(
			shouldBypassSessionGate({
				...req({ pathname: "/playground" }),
				playgroundEnabled: false,
			}),
		).toBe(false);
		expect(
			shouldBypassSessionGate({
				...req({ pathname: "/playground" }),
				playgroundEnabled: true,
			}),
		).toBe(true);
		expect(
			shouldBypassSessionGate({
				...req({ pathname: "/playground/lab/profile-dropdown" }),
				playgroundEnabled: true,
			}),
		).toBe(true);
		expect(
			shouldBypassSessionGate({
				...req({ pathname: "/playground/compose" }),
				playgroundEnabled: true,
			}),
		).toBe(true);
	});

	it("proxy reads PLAYGROUND_ENABLED only via @afenda/env", () => {
		const source = readProxySource();
		expect(source).toContain('from "@afenda/env"');
		expect(source).toContain("env.PLAYGROUND_ENABLED");
		expect(source).not.toContain("process.env.PLAYGROUND_ENABLED");
	});
});

describe("N6 proxy session gate (disk)", () => {
	it("wires createSessionProxy and only bypasses via shouldBypassSessionGate", () => {
		const source = readProxySource();
		expect(source).toContain('from "@afenda/auth"');
		expect(source).toContain("createSessionProxy");
		expect(source).toContain("shouldBypassSessionGate");
		expect(source).toContain("runSessionGate(request)");
		expect(source).toContain("x-afenda-pathname");
	});

	it("matcher covers protected shells and excludes public auth/join/api/static", () => {
		const source = readProxySource();
		for (const route of [
			'"/account/:path*"',
			'"/dashboard/:path*"',
			'"/admin/:path*"',
			'"/client/:path*"',
		]) {
			expect(source).toContain(route);
		}
		const matcherBlock = source.match(
			/export const config = \{[\s\S]*?matcher:\s*\[([\s\S]*?)\]/,
		);
		expect(matcherBlock).not.toBeNull();
		const matcherBody = matcherBlock?.[1] ?? "";
		expect(matcherBody).not.toMatch(/["']\/auth/);
		expect(matcherBody).not.toMatch(/["']\/join/);
		expect(matcherBody).not.toMatch(/["']\/api/);
		expect(matcherBody).not.toMatch(/["']\/_next/);
		expect(source).not.toContain('"/auth');
		expect(source).not.toContain('"/join');
	});

	it("public Neon Auth UI and join pages exist and stay outside the matcher", () => {
		const webRoot = resolve(import.meta.dirname, "..");
		expect(
			existsSync(resolve(webRoot, "app/(public)/auth/[path]/page.tsx")),
		).toBe(true);
		expect(existsSync(resolve(webRoot, "app/(public)/join/page.tsx"))).toBe(
			true,
		);

		const source = readProxySource();
		expect(source).not.toContain('"/auth');
		expect(source).not.toContain('"/join');
		expect(source).not.toContain("'/auth");
		expect(source).not.toContain("'/join");
	});
});
