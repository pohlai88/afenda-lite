/**
 * N16 — Shared ERP platform shell: permission-gated nav + import boundary.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { OPERATOR_SHELL_NAV } from "../features/portal-chrome/nav-config";
import { resolveOperatorShellNav } from "../features/portal-chrome/resolve-shell-access";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

vi.mock("@/modules/identity/domain/has-permission", () => ({
	hasPermission: vi.fn(),
}));

import { hasPermission } from "../modules/identity/domain/has-permission";

const hasPermissionMock = vi.mocked(hasPermission);

const session = {
	orgId: "org-n16",
	userId: "user-n16",
	role: "operator" as const,
};

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("portal-chrome (N16)", () => {
	beforeEach(() => {
		hasPermissionMock.mockReset();
	});

	it("filters operator nav via Identity permission ports (OR per item)", async () => {
		hasPermissionMock.mockImplementation(async ({ code }) => {
			if (code === "org.roles.manage") return true;
			if (code === "fft.access") return false;
			return false;
		});

		const nav = await resolveOperatorShellNav(session);
		expect(nav.map((item) => item.id)).toEqual(["org-admin"]);
	});

	it("includes FFT nav when fft.access is granted", async () => {
		hasPermissionMock.mockImplementation(
			async ({ code }) => code === "fft.access",
		);

		const nav = await resolveOperatorShellNav(session);
		expect(nav.map((item) => item.id)).toEqual(["fft"]);
	});

	it("exposes module-tagged nav for on-disk operator routes only", () => {
		const hrefs = OPERATOR_SHELL_NAV.map((item) => item.href);
		expect(hrefs).toEqual(["/admin", "/fft"]);
		expect(OPERATOR_SHELL_NAV.every((item) => item.kind === "module")).toBe(
			true,
		);
	});

	it("does not import vertical domain modules", () => {
		const portalChromeSources = [
			"features/portal-chrome/nav-config.ts",
			"features/portal-chrome/resolve-shell-access.ts",
			"features/portal-chrome/operator-platform-shell.tsx",
			"features/portal-chrome/operator-platform-chrome.tsx",
		];

		for (const file of portalChromeSources) {
			const text = source(file);
			expect(text).not.toMatch(/@\/modules\/declarations/);
			expect(text).not.toMatch(/@\/modules\/fft\/domain/);
		}
	});

	it("wires operator layout to OperatorPlatformShell", () => {
		const layout = source("app/(operator)/layout.tsx");
		expect(layout).toContain("OperatorPlatformShell");
		expect(layout).toContain('requireRole("operator")');
	});

	it("promotes shell-01 header DNA without locale/social/CDN chrome", () => {
		const chrome = source(
			"features/portal-chrome/operator-platform-chrome.tsx",
		);
		expect(chrome).toContain("Breadcrumb");
		expect(chrome).toContain("SidebarTrigger");
		expect(chrome).toContain("bg-surface-raised");
		expect(chrome).not.toMatch(/LanguageDropdown|dropdown-language/i);
		expect(chrome).not.toMatch(/FacebookIcon|cdn\.shadcnstudio/i);
		expect(chrome).not.toMatch(/shadcn-studio/);
	});
});
