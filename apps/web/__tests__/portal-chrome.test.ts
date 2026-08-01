/**
 * N16 — Shared ERP platform shell: permission-gated nav + import boundary.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	CLIENT_SHELL_NAV,
	OPERATOR_SHELL_NAV,
	SHELL_MODULE_PRESENTATION,
	SHELL_NAV_SECTIONS,
} from "../features/portal-chrome/nav-config";
import {
	resolveClientShellNav,
	resolveOperatorShellNav,
} from "../features/portal-chrome/resolve-shell-access";
import {
	buildWorkspaceCommandGroups,
	buildWorkspaceNavigation,
	findActiveWorkspaceItem,
} from "../features/portal-chrome/workspace-platform-model";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const uiSystemRoot = path.join(
	webRoot,
	"../../packages/surfaces/ui-system/src",
);

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

function uiSource(relativePath: string): string {
	return readFileSync(path.join(uiSystemRoot, relativePath), "utf8");
}

describe("portal-chrome (N16)", () => {
	beforeEach(() => {
		hasPermissionMock.mockReset();
	});

	it("filters operator nav via Identity permission ports (OR per item)", async () => {
		hasPermissionMock.mockImplementation(async ({ code }) => {
			if (code === "org.roles.manage") {
				return await true;
			}
			if (code === "inventory.movement.read") {
				return await true;
			}
			return await false;
		});

		const nav = await resolveOperatorShellNav(session);
		expect(nav.map((item) => item.id)).toEqual(["org-admin", "inventory"]);
	});

	it("hides org-admin nav when no listed permission is granted", async () => {
		hasPermissionMock.mockResolvedValue(false);

		const nav = await resolveOperatorShellNav(session);
		expect(nav.map((item) => item.id)).toEqual([]);
	});

	it("filters client nav for inventory read without operator-only items", async () => {
		hasPermissionMock.mockImplementation(async ({ code }) => {
			if (code === "inventory.movement.read") {
				return await true;
			}
			return await false;
		});

		const nav = await resolveClientShellNav({
			...session,
			role: "client",
		});
		expect(nav.map((item) => item.id)).toEqual(["inventory"]);
		expect(nav.every((item) => item.href.startsWith("/client/"))).toBe(true);
		expect(CLIENT_SHELL_NAV.some((item) => item.id === "org-admin")).toBe(
			false,
		);
	});

	it("exposes module-tagged nav for on-disk operator routes only", () => {
		const hrefs = OPERATOR_SHELL_NAV.map((item) => item.href);
		expect(hrefs).toContain("/admin");
		expect(hrefs).toContain("/admin/inventory");
		expect(hrefs.every((href) => href.startsWith("/admin"))).toBe(true);
		expect(OPERATOR_SHELL_NAV.every((item) => item.kind === "module")).toBe(
			true,
		);
	});

	it("does not import vertical domain modules", () => {
		const portalChromeSources = [
			"features/portal-chrome/nav-config.ts",
			"features/portal-chrome/resolve-shell-access.ts",
			"features/portal-chrome/workspace-platform-shell.tsx",
			"features/portal-chrome/workspace-platform-chrome.tsx",
		];

		for (const file of portalChromeSources) {
			const text = source(file);
			expect(text).not.toMatch(/@\/modules\/(?!identity\/|platform\/)/);
		}
	});

	it("wires both authenticated layouts to the canonical workspace shell", () => {
		const layout = source("app/(operator)/layout.tsx");
		const clientLayout = source("app/(client)/client/(workspace)/layout.tsx");
		expect(layout).toContain("WorkspacePlatformShell");
		expect(layout).toContain('scope="operator"');
		expect(layout).toContain('requireRole("operator")');
		expect(clientLayout).toContain("WorkspacePlatformShell");
		expect(clientLayout).toContain('scope="client"');
		expect(clientLayout).toContain('requireRole("client")');
	});

	it("derives grouped module icons from one presentation registry", () => {
		expect(SHELL_NAV_SECTIONS.map((section) => section.id)).toEqual([
			"administration",
			"commercial",
			"operations",
			"finance",
			"people",
		]);
		expect(SHELL_MODULE_PRESENTATION.accounting.sectionId).toBe("finance");
		expect(SHELL_MODULE_PRESENTATION.inventory.sectionId).toBe("operations");
		expect(SHELL_MODULE_PRESENTATION["human-resources"].sectionId).toBe(
			"people",
		);
	});

	it("derives navigation, commands, and longest active route from one input", () => {
		const navItems = OPERATOR_SHELL_NAV.filter((item) =>
			["org-admin", "payables", "accounting"].includes(item.id),
		);
		const sections = buildWorkspaceNavigation(navItems);
		const commands = buildWorkspaceCommandGroups(navItems, sections);

		expect(sections.map((section) => section.id)).toEqual([
			"administration",
			"finance",
		]);
		expect(commands.map((group) => group.id)).toEqual([
			"administration",
			"finance",
		]);
		expect(
			findActiveWorkspaceItem(navItems, "/admin/payables/invoices")?.id,
		).toBe("payables");
	});

	it("keeps authenticated workspaces on background and embeds segment states", () => {
		const shellBlock = uiSource("blocks/app-shell-block/app-shell.tsx");
		const clientHome = source("app/(client)/client/(workspace)/page.tsx");
		expect(shellBlock).toContain("<SidebarInset");
		expect(shellBlock).toContain('className="bg-background"');
		expect(clientHome).not.toContain("bg-gradient-to-b");

		for (const relativePath of [
			"app/(operator)/loading.tsx",
			"app/(operator)/error.tsx",
			"app/(operator)/not-found.tsx",
			"app/(client)/client/(workspace)/loading.tsx",
			"app/(client)/client/(workspace)/error.tsx",
			"app/(client)/client/(workspace)/not-found.tsx",
		]) {
			const body = source(relativePath);
			expect(body, relativePath).toContain("asLandmark={false}");
			expect(body, relativePath).not.toContain("bg-canvas");
		}
	});

	it("passes server-read sidebar cookie into SidebarProvider defaultOpen", () => {
		const shell = source("features/portal-chrome/workspace-platform-shell.tsx");
		const chrome = source(
			"features/portal-chrome/workspace-platform-chrome.tsx",
		);
		expect(shell).toContain("SIDEBAR_COOKIE_NAME");
		expect(shell).toContain("cookies()");
		expect(shell).toContain("defaultSidebarOpen");
		expect(chrome).toContain("defaultSidebarOpen={defaultSidebarOpen}");
	});

	it("promotes shell-01 header DNA without locale/social/CDN chrome", () => {
		const chrome = source(
			"features/portal-chrome/workspace-platform-chrome.tsx",
		);
		const header = uiSource("blocks/app-shell-block/header.tsx");
		expect(header).toContain("Breadcrumb");
		expect(header).toContain("SidebarTrigger");
		expect(header).toContain("rounded-xl border bg-card");
		expect(chrome).not.toMatch(/LanguageDropdown|dropdown-language/i);
		expect(chrome).not.toMatch(/FacebookIcon|cdn\.shadcnstudio/i);
		expect(chrome).not.toMatch(/shadcn-studio/);
	});

	it("adopts the archived app-shell customizer without archive runtime imports", () => {
		const chrome = source(
			"features/portal-chrome/workspace-platform-chrome.tsx",
		);
		const shellBlock = uiSource("blocks/app-shell-block/app-shell.tsx");
		const settings = uiSource(
			"blocks/app-shell-block/application-shell-settings.ts",
		);
		const provider = uiSource(
			"blocks/app-shell-block/application-shell-settings-provider.tsx",
		);
		const customizer = uiSource("blocks/app-shell-block/theme-customiser.tsx");
		const header = uiSource("blocks/app-shell-block/header.tsx");

		expect(chrome).toContain("AppShell");
		expect(header).toContain("ThemeCustomiser");
		expect(header).toContain("rounded-xl border bg-card");
		expect(customizer).toContain("Color mode");
		expect(customizer).toContain("Content layout");
		expect(customizer).toContain("Sidebar variant");
		expect(customizer).toContain("Sidebar collapse");
		expect(settings).toContain("isApplicationShellSettings");
		expect(provider).toContain("document.cookie");
		expect(provider).not.toContain("localStorage");

		for (const body of [chrome, shellBlock, settings, provider, customizer]) {
			expect(body).not.toMatch(/_reference|shadcn-pro-dashboard|shadcn-studio/);
		}
	});
});
