import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-admin",
	orgId: "org-admin",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
	inviteableRolesFor: vi.fn((role: string) =>
		role === "operator" || role === "admin" ? ["client", "operator"] : [],
	),
	JOIN_PATH: "/join",
}));

const permissionMocks = vi.hoisted(() => ({
	sessionHasPermission: vi.fn(),
}));

const identityMocks = vi.hoisted(() => ({
	listAssignableRoles: vi.fn(),
	listRoleAssignments: vi.fn(),
	listOrganizationUsers: vi.fn(),
}));

const platformMocks = vi.hoisted(() => ({
	listOrgRbacAudit: vi.fn(),
}));

const adminMocks = vi.hoisted(() => ({
	listOrganizations: vi.fn(),
	getOrganizationUsageMetrics: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
	redirect: vi.fn((path: string) => {
		throw new Error(`NEXT_REDIRECT:${path}`);
	}),
}));

vi.mock("@afenda/auth", () => ({
	AUTH_FORBIDDEN_PATH: "/403",
	JOIN_PATH: authMocks.JOIN_PATH,
	inviteableRolesFor: authMocks.inviteableRolesFor,
	requireRole: authMocks.requireRole,
}));

vi.mock("@afenda/admin", () => ({
	listOrganizations: adminMocks.listOrganizations,
}));

vi.mock("@afenda/admin/usage", () => ({
	getOrganizationUsageMetrics: adminMocks.getOrganizationUsageMetrics,
}));

vi.mock("next/navigation", () => ({
	redirect: navigationMocks.redirect,
}));

vi.mock("@/modules/identity/domain/session-permission", () => ({
	sessionHasPermission: permissionMocks.sessionHasPermission,
	PERMISSION_DENIED_MESSAGE: {},
}));

vi.mock("@/modules/identity/domain/list-assignable-roles", () => ({
	listAssignableRoles: identityMocks.listAssignableRoles,
}));

vi.mock("@/modules/identity/domain/list-role-assignments", () => ({
	listRoleAssignments: identityMocks.listRoleAssignments,
}));

vi.mock("@/modules/identity/domain/organization-users", () => ({
	listOrganizationUsers: identityMocks.listOrganizationUsers,
}));

vi.mock("@/modules/identity/domain/organization-member-search", () => ({
	syncOrganizationMemberSearchIndex: vi.fn().mockResolvedValue({
		ok: true,
		data: { upserted: 0, pruned: 0 },
	}),
}));

vi.mock("@/modules/platform/domain/list-rbac-audit", () => ({
	listOrgRbacAudit: platformMocks.listOrgRbacAudit,
}));

vi.mock("@/features/org-admin/invite-member-form", () => ({
	InviteMemberForm: (props: { inviteableRoles: string[] }) =>
		createElement("div", {
			"data-testid": "invite-member-form",
			"data-roles": props.inviteableRoles.join(","),
		}),
}));

vi.mock("@/features/org-admin/org-admin-panels", () => ({
	OrgAdminPanels: (props: {
		memberDirectory: { status: string; options: { id: string }[] };
		assignments: { userId: string; userLabel: string }[];
	}) =>
		createElement("div", {
			"data-testid": "org-admin-panels",
			"data-directory-status": props.memberDirectory.status,
			"data-directory-count": String(props.memberDirectory.options.length),
			"data-assignment-label": props.assignments[0]?.userLabel ?? "",
		}),
}));

vi.mock("@/features/org-admin/org-console-panels", () => ({
	OrgConsolePanels: (props: {
		orgList: { status: string; organizations: { id: string }[] };
		usage: { status: string };
		activeOrgId: string;
	}) =>
		createElement("div", {
			"data-testid": "org-console-panels",
			"data-org-list-status": props.orgList.status,
			"data-org-count": String(props.orgList.organizations.length),
			"data-usage-status": props.usage.status,
			"data-active-org": props.activeOrgId,
		}),
}));

import { OrgAdminShell } from "../features/org-admin/org-admin-shell";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

async function renderShellHtml(): Promise<string> {
	const tree = await OrgAdminShell();
	return renderToStaticMarkup(tree);
}

describe("OrgAdminShell — RSC STABILITY", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(session);
		identityMocks.listAssignableRoles.mockResolvedValue([
			{
				id: "role_1",
				name: "Org Admin",
				active: true,
				isSystemTemplate: true,
			},
		]);
		identityMocks.listRoleAssignments.mockResolvedValue([
			{
				id: "asg_1",
				userId: "user_1",
				roleId: "role_1",
				scopeType: "organization",
				active: true,
			},
		]);
		identityMocks.listOrganizationUsers.mockResolvedValue([
			{
				userId: "user_1",
				name: "Ada",
				email: "ada@example.com",
			},
		]);
		platformMocks.listOrgRbacAudit.mockResolvedValue([
			{
				id: "aud_1",
				action: "role.assign",
				targetType: "assignment",
				targetId: "asg_1",
				actorUserId: "user_1",
				roleId: "role_1",
				reason: null,
				createdAt: new Date("2026-07-17T08:00:00.000Z"),
				oldValue: null,
				newValue: { roleId: "role_1" },
			},
		]);
		adminMocks.listOrganizations.mockResolvedValue({
			ok: true,
			data: [
				{
					id: "org-admin",
					slug: "admin-org",
					name: "Admin Org",
					lastActivityAt: new Date("2026-07-17T08:00:00.000Z"),
				},
			],
		});
		adminMocks.getOrganizationUsageMetrics.mockResolvedValue({
			ok: true,
			data: {
				orgId: "org-admin",
				period: "2026-07",
				activeMembers: 1,
				rbacAuditEvents: 2,
				activeRoleAssignments: 1,
			},
		});
	});

	it("pins fail-closed requireRole('operator') + section density", () => {
		const shell = source("features/org-admin/org-admin-shell.tsx");
		const chrome = source(
			"features/portal-chrome/operator-platform-chrome.tsx",
		);
		expect(shell).toContain('requireRole("operator")');
		expect(shell).not.toMatch(/\bgetSession\b/);
		expect(shell).toContain("<main");
		expect(shell).toContain("gap-(--section-gap)");
		expect(shell).toContain("MetricGrid");
		expect(shell).toContain("listOrganizations");
		expect(shell).toContain('from "@afenda/admin/usage"');
		expect(chrome).toContain("bg-canvas");
		expect(shell).not.toMatch(/from ["']@afenda\/db["']/);
	});

	it("forbids when neither clients.invite nor org.roles.manage", async () => {
		permissionMocks.sessionHasPermission.mockResolvedValue(false);

		await expect(OrgAdminShell()).rejects.toThrow("NEXT_REDIRECT:/403");
		expect(identityMocks.listAssignableRoles).not.toHaveBeenCalled();
		expect(identityMocks.listOrganizationUsers).not.toHaveBeenCalled();
	});

	it("loads role ports only when org.roles.manage is granted", async () => {
		permissionMocks.sessionHasPermission.mockImplementation(
			async (_session, code: string) => code === "clients.invite",
		);

		const html = await renderShellHtml();

		expect(html).toContain('data-testid="invite-member-form"');
		expect(html).not.toContain('data-testid="org-admin-panels"');
		expect(html).toContain('data-testid="org-console-panels"');
		expect(identityMocks.listAssignableRoles).not.toHaveBeenCalled();
		expect(identityMocks.listRoleAssignments).not.toHaveBeenCalled();
		expect(platformMocks.listOrgRbacAudit).not.toHaveBeenCalled();
		expect(identityMocks.listOrganizationUsers).not.toHaveBeenCalled();
		expect(adminMocks.listOrganizations).toHaveBeenCalled();
		expect(adminMocks.getOrganizationUsageMetrics).toHaveBeenCalled();
	});

	it("composes panels when org.roles.manage is granted", async () => {
		permissionMocks.sessionHasPermission.mockImplementation(
			async (_session, code: string) => code === "org.roles.manage",
		);

		const html = await renderShellHtml();

		expect(html).toContain('data-testid="org-admin-panels"');
		expect(html).toContain('data-directory-status="ready"');
		expect(html).toContain('data-directory-count="1"');
		expect(html).toContain('data-assignment-label="Ada · ada@example.com"');
		expect(html).not.toContain('data-testid="invite-member-form"');
		expect(html).toContain('data-org-list-status="ready"');
		expect(html).toContain('data-org-count="1"');
		expect(html).toContain('data-usage-status="ready"');
		expect(identityMocks.listAssignableRoles).toHaveBeenCalledWith("org-admin");
		expect(identityMocks.listRoleAssignments).toHaveBeenCalledWith("org-admin");
		expect(platformMocks.listOrgRbacAudit).toHaveBeenCalledWith("org-admin");
		expect(identityMocks.listOrganizationUsers).toHaveBeenCalledWith(
			"org-admin",
		);
	});

	it("composes invite + panels when both permissions are granted", async () => {
		permissionMocks.sessionHasPermission.mockResolvedValue(true);

		const html = await renderShellHtml();

		expect(html).toContain('data-testid="invite-member-form"');
		expect(html).toContain('data-testid="org-admin-panels"');
		expect(html).toContain('data-testid="org-console-panels"');
		expect(authMocks.requireRole).toHaveBeenCalledWith("operator");
	});

	it("maps org list and usage package failures to unavailable console state", async () => {
		permissionMocks.sessionHasPermission.mockResolvedValue(true);
		adminMocks.listOrganizations.mockResolvedValue({
			ok: false,
			code: "UNAUTHORIZED",
			message: "Not authorized for organization console",
		});
		adminMocks.getOrganizationUsageMetrics.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Usage metrics require the active session organization",
		});

		const html = await renderShellHtml();

		expect(html).toContain('data-org-list-status="unavailable"');
		expect(html).toContain('data-usage-status="unavailable"');
		expect(html).toContain('data-org-count="0"');
	});
});
