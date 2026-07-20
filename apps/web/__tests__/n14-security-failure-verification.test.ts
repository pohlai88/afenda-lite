/**
 * N14 — security / failure verification: action-level permission denial +
 * evidence pins for denial surfaces (GUIDE-017 · neon-auth-slice-map N14).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-n14-operator",
	orgId: "org-n14",
	role: "operator" as const,
	email: "operator-n14@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
	canInviteMember: vi.fn(),
	inviteOrgMember: vi.fn(),
	buildJoinUrl: vi.fn(),
}));

const identityMocks = vi.hoisted(() => ({
	assignOrgRoleWithAudit: vi.fn(),
	revokeOrgRoleWithAudit: vi.fn(),
	getOrganizationUser: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
	recordRbacAudit: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	AUTH_FORBIDDEN_PATH: "/403",
	requireRole: authMocks.requireRole,
	canInviteMember: authMocks.canInviteMember,
	inviteOrgMember: authMocks.inviteOrgMember,
	buildJoinUrl: authMocks.buildJoinUrl,
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers: async () => ({
		get: () => null,
	}),
}));

vi.mock("@/modules/identity/domain/has-permission", () => ({
	hasPermission: vi.fn(),
}));

vi.mock("@/modules/identity/domain/assign-org-role-audited", () => ({
	assignOrgRoleWithAudit: identityMocks.assignOrgRoleWithAudit,
}));

vi.mock("@/modules/identity/domain/organization-users", () => ({
	getOrganizationUser: identityMocks.getOrganizationUser,
}));

vi.mock("@/modules/identity/domain/revoke-org-role-audited", () => ({
	revokeOrgRoleWithAudit: identityMocks.revokeOrgRoleWithAudit,
}));

vi.mock("@afenda/admin/audit", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/admin/audit")>();
	return {
		...actual,
		recordRbacAudit: auditMocks.recordRbacAudit,
	};
});

import { assignOrgRoleAction } from "../app/actions/assign-org-role";
import { inviteOrgMemberAction } from "../app/actions/invite-org-member";
import { revokeOrgRoleAction } from "../app/actions/revoke-org-role";
import { hasPermission } from "../modules/identity/domain/has-permission";
import { PERMISSION_DENIED_MESSAGE } from "../modules/identity/domain/session-permission";

const hasPermissionMock = vi.mocked(hasPermission);

const ROLE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const ASSIGNMENT_UUID = "09ec6b05-9e7d-4de4-99e0-046c216fd4d1";
const USER_ID = "member-user-n14";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("N14 action permission denial", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		authMocks.canInviteMember.mockReturnValue(true);
		authMocks.buildJoinUrl.mockReturnValue(
			"/join?invitationId=inv-n14-fixture",
		);
		hasPermissionMock.mockResolvedValue(false);
		identityMocks.getOrganizationUser.mockResolvedValue({
			userId: USER_ID,
			email: "member@example.com",
			name: "Member",
			neonRole: "member",
		});
	});

	it("denies assignOrgRoleAction with FORBIDDEN and skips audited mutation", async () => {
		const formData = new FormData();
		formData.set("userId", USER_ID);
		formData.set("roleId", ROLE_ID);

		const result = await assignOrgRoleAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: PERMISSION_DENIED_MESSAGE["org.roles.manage"],
		});
		expect(hasPermissionMock).toHaveBeenCalledWith({
			orgId: operatorSession.orgId,
			userId: operatorSession.userId,
			code: "org.roles.manage",
			bootstrapRole: operatorSession.role,
		});
		expect(identityMocks.getOrganizationUser).not.toHaveBeenCalled();
		expect(identityMocks.assignOrgRoleWithAudit).not.toHaveBeenCalled();
	});

	it("denies revokeOrgRoleAction with FORBIDDEN and skips audited mutation", async () => {
		const formData = new FormData();
		formData.set("assignmentId", ASSIGNMENT_UUID);

		const result = await revokeOrgRoleAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: PERMISSION_DENIED_MESSAGE["org.roles.manage"],
		});
		expect(hasPermissionMock).toHaveBeenCalledWith({
			orgId: operatorSession.orgId,
			userId: operatorSession.userId,
			code: "org.roles.manage",
			bootstrapRole: operatorSession.role,
		});
		expect(identityMocks.revokeOrgRoleWithAudit).not.toHaveBeenCalled();
	});

	it("denies inviteOrgMemberAction with FORBIDDEN and skips invite + audit", async () => {
		const formData = new FormData();
		formData.set("email", "new.member@example.com");
		formData.set("role", "client");

		const result = await inviteOrgMemberAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: PERMISSION_DENIED_MESSAGE["clients.invite"],
		});
		expect(hasPermissionMock).toHaveBeenCalledWith({
			orgId: operatorSession.orgId,
			userId: operatorSession.userId,
			code: "clients.invite",
			bootstrapRole: operatorSession.role,
		});
		expect(authMocks.inviteOrgMember).not.toHaveBeenCalled();
		expect(auditMocks.recordRbacAudit).not.toHaveBeenCalled();
	});
});

describe("N14 denial surface evidence pins", () => {
	it("keeps assign/revoke/invite on forbidUnlessPermission", () => {
		for (const relativePath of [
			"app/actions/assign-org-role.ts",
			"app/actions/revoke-org-role.ts",
			"app/actions/invite-org-member.ts",
		] as const) {
			expect(source(relativePath)).toContain("forbidUnlessPermission");
		}
	});

	it("keeps proxy fail-closed on createSessionProxy + shouldBypassSessionGate", () => {
		const proxy = source("proxy.ts");
		expect(proxy).toContain("createSessionProxy");
		expect(proxy).toContain("shouldBypassSessionGate");
		expect(proxy).toContain("/admin/:path*");
		expect(proxy).toContain("/client/:path*");
		expect(proxy).toContain("/dashboard/:path*");
	});

	it("keeps AUTH_FORBIDDEN_PATH wired for wrong-role / permission RSC denial", () => {
		const authPaths = readFileSync(
			path.join(webRoot, "../../packages/control-plane/auth/src/auth-paths.ts"),
			"utf8",
		);
		const rbac = readFileSync(
			path.join(webRoot, "../../packages/control-plane/auth/src/rbac.ts"),
			"utf8",
		);
		const requirePermission = source("features/auth/require-permission.ts");
		expect(authPaths).toContain('AUTH_FORBIDDEN_PATH = "/403"');
		expect(rbac).toContain("AUTH_FORBIDDEN_PATH");
		expect(requirePermission).toContain("AUTH_FORBIDDEN_PATH");
		expect(requirePermission).toContain("redirect");
	});

	it("keeps Playwright workerTenant empty-pattern so playwright-base loads", () => {
		const playwrightBase = readFileSync(
			path.join(webRoot, "../../testing/e2e/playwright-base.ts"),
			"utf8",
		);
		expect(playwrightBase).toContain(
			"biome-ignore lint/correctness/noEmptyPattern: Playwright worker fixture API",
		);
		expect(playwrightBase).toContain("async ({}, use, workerInfo)");
		expect(playwrightBase).not.toContain("async (_fixtures, use, workerInfo)");
	});
});
