/**
 * PL-S4 — Join + accept-invitation redirect contract.
 * Public invitation entry only; no membership / tenancy writes.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	AUTH_ACCEPT_INVITATION_PATH,
	JOIN_PATH,
	PRE_LOGIN_PUBLIC_PATHS,
} from "@afenda/auth/client";
import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

const JOIN_SEGMENT_FILES = [
	"app/(public)/join/page.tsx",
	"app/(public)/join/layout.tsx",
	"app/(public)/join/loading.tsx",
	"app/(public)/join/error.tsx",
	"features/auth/join-shell.tsx",
] as const;

describe("join accept-invitation (PL-S4)", () => {
	it("keeps /join on the Pre-Login public allowlist", () => {
		expect(JOIN_PATH).toBe("/join");
		expect(PRE_LOGIN_PUBLIC_PATHS).toContain(JOIN_PATH);
		expect(AUTH_ACCEPT_INVITATION_PATH).toBe("/auth/accept-invitation");
		expect(PRE_LOGIN_PUBLIC_PATHS).not.toContain(AUTH_ACCEPT_INVITATION_PATH);
	});

	it("ships the join island tree on disk", () => {
		for (const relativePath of JOIN_SEGMENT_FILES) {
			expect(existsSync(path.join(webRoot, relativePath))).toBe(true);
		}
	});

	it("parses invitation query and renders required / invalid / Neon handoff", () => {
		const page = source("app/(public)/join/page.tsx");
		expect(page).toContain("parseJoinInvitationQuery");
		expect(page).toContain("PublicMessageShell");
		expect(page).toContain("JoinShell");
		expect(page).toContain("SignInButton");
		expect(page).toContain("Invitation required");
		expect(page).toContain("Invalid invitation link");
		expect(page).toContain('case "missing"');
		expect(page).toContain('case "invalid"');
		expect(page).toContain('case "present"');
		expect(page).toContain("const _exhaustive: never");
		expect(page).toContain("invitationId?: string | string[]");
		// PL-S12 — message shells must not nest a second <main> under AuthIslandLayout.
		expect(page).toContain("asLandmark={false}");
		expect(page).not.toContain("recordRbacAudit");
		expect(page).not.toContain("platform_membership");
		expect(page).not.toContain("@afenda/db");
		expect(page).not.toMatch(/console\.(log|info|debug|warn|error)/);
	});

	it("keeps JoinShell on Neon AcceptInvitationCard inside auth island chrome", () => {
		const shell = source("features/auth/join-shell.tsx");
		expect(shell).toContain("AcceptInvitationCard");
		expect(shell).toContain("AuthSurfaceChrome");
		expect(shell).toContain('from "@neondatabase/auth-ui"');
		expect(shell).not.toMatch(/@neondatabase\/auth['"]/);
		expect(shell).not.toMatch(/<form[\s>]/i);
		expect(shell).not.toContain("recordRbacAudit");
		expect(shell).not.toContain("platform_membership");
		expect(shell).not.toMatch(/console\.(log|info|debug|warn|error)/);
	});

	it("declares accept-invitation → /join as permanent redirect preserving invitationId", () => {
		const nextConfig = source("next.config.ts");
		// CJS-safe local consts pin the same literals as @afenda/auth SSOT.
		expect(AUTH_ACCEPT_INVITATION_PATH).toBe("/auth/accept-invitation");
		expect(JOIN_PATH).toBe("/join");
		expect(nextConfig).toContain(
			`const AUTH_ACCEPT_INVITATION_PATH = "${AUTH_ACCEPT_INVITATION_PATH}"`,
		);
		expect(nextConfig).toContain(`const JOIN_PATH = "${JOIN_PATH}"`);
		expect(nextConfig).toContain("source: AUTH_ACCEPT_INVITATION_PATH");
		// Pin next.config template literal text without embedding `${` in a string literal.
		expect(nextConfig).toContain(
			["destination: `", "$", "{JOIN_PATH}?invitationId=:invitationId`"].join(
				"",
			),
		);
		expect(nextConfig).toContain("destination: JOIN_PATH");
		expect(nextConfig).toContain("permanent: true");
		expect(nextConfig).toContain('key: "invitationId"');
		expect(nextConfig).toContain('value: "(?<invitationId>.+)"');
	});

	it("shares Neon Auth island CSS via join layout", () => {
		const layout = source("app/(public)/join/layout.tsx");
		expect(layout).toContain("AuthIslandLayout");
		expect(layout).toContain("auth-surface.css");
		expect(layout).toContain("neon-auth-ui.css");
	});
});
