/**
 * N12 — living authz mutation audit wiring + safe ActionResult / error evidence.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-n12-operator",
	orgId: "org-n12",
	role: "operator" as const,
	email: "operator@example.com",
};

const clientSession = {
	userId: "user-n12-client",
	orgId: "org-n12",
	role: "client" as const,
	email: "client@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
	getApiSession: vi.fn(),
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

const declarationMocks = vi.hoisted(() => ({
	getClientDeclarationDraft: vi.fn(),
	isClientOnboardingComplete: vi.fn(),
	saveClientDeclarationDraft: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
	getApiSession: authMocks.getApiSession,
	canInviteMember: authMocks.canInviteMember,
	inviteOrgMember: authMocks.inviteOrgMember,
	buildJoinUrl: authMocks.buildJoinUrl,
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
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

vi.mock("@/modules/platform/domain/record-rbac-audit", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("../modules/platform/domain/record-rbac-audit")
		>();
	return {
		...actual,
		recordRbacAudit: auditMocks.recordRbacAudit,
	};
});

vi.mock("@/modules/declarations/domain/declaration-draft", () => ({
	getClientDeclarationDraft: declarationMocks.getClientDeclarationDraft,
	isClientOnboardingComplete: declarationMocks.isClientOnboardingComplete,
	saveClientDeclarationDraft: declarationMocks.saveClientDeclarationDraft,
}));

import { assignOrgRoleAction } from "../app/actions/assign-org-role";
import {
	loadDeclarationDraftAction,
	saveDeclarationDraftAction,
} from "../app/actions/declaration-draft";
import { inviteOrgMemberAction } from "../app/actions/invite-org-member";
import { revokeOrgRoleAction } from "../app/actions/revoke-org-role";
import { hasPermission } from "../modules/identity/domain/has-permission";
import { MEMBER_INVITE_AUDIT_ACTION } from "../modules/platform/domain/record-rbac-audit";

const hasPermissionMock = vi.mocked(hasPermission);

const ROLE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const ASSIGNMENT_ID = "11111111-2222-4333-8444-555555555555";
const USER_ID = "member-user-n12";
const ASSIGNMENT_UUID = "09ec6b05-9e7d-4de4-99e0-046c216fd4d1";
const SURVEY_UUID = "bfc535bd-54f4-4607-9a59-279150339e89";

const secretLeak =
	"postgres://user:SECRET_PASSWORD@ep-xxx.neon.tech/neondb?sslmode=require";

describe("N12 living authz audit evidence", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		authMocks.getApiSession.mockResolvedValue(clientSession);
		authMocks.canInviteMember.mockReturnValue(true);
		authMocks.buildJoinUrl.mockReturnValue(
			"/join?invitationId=inv-n12-fixture",
		);
		hasPermissionMock.mockResolvedValue(true);
		declarationMocks.isClientOnboardingComplete.mockResolvedValue(true);
		identityMocks.getOrganizationUser.mockResolvedValue({
			userId: USER_ID,
			email: "member@example.com",
			name: "Member",
			neonRole: "member",
		});
	});

	it("stamps member.invite audit and returns auditId after invite (cross-system)", async () => {
		authMocks.inviteOrgMember.mockResolvedValue({
			invitationId: "inv-n12-fixture",
		});
		auditMocks.recordRbacAudit.mockResolvedValue({ id: "audit-invite-1" });

		const formData = new FormData();
		formData.set("email", "new.member@example.com");
		formData.set("role", "client");

		const result = await inviteOrgMemberAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: {
				email: "new.member@example.com",
				auditId: "audit-invite-1",
				joinUrl: "/join?invitationId=inv-n12-fixture",
			},
		});
		expect(authMocks.inviteOrgMember).toHaveBeenCalled();
		expect(auditMocks.recordRbacAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				orgId: "org-n12",
				action: MEMBER_INVITE_AUDIT_ACTION,
				actorUserId: "user-n12-operator",
				targetType: "membership",
				targetId: "new.member@example.com",
			}),
		);
	});

	it("returns safe INTERNAL_ERROR when invite audit write fails (compensating control)", async () => {
		authMocks.inviteOrgMember.mockResolvedValue({
			invitationId: "inv-n12-fixture",
		});
		auditMocks.recordRbacAudit.mockRejectedValue(new Error(secretLeak));

		const formData = new FormData();
		formData.set("email", "new.member@example.com");
		formData.set("role", "client");

		const result = await inviteOrgMemberAction(null, formData);

		expect(result).toMatchObject({
			ok: false,
			code: "INTERNAL_ERROR",
		});
		expect(JSON.stringify(result)).not.toContain("SECRET_PASSWORD");
		expect(JSON.stringify(result)).not.toContain("postgres://");
		expect(JSON.stringify(result)).not.toContain(secretLeak);
	});

	it("returns auditId from DB-atomic assignOrgRoleWithAudit", async () => {
		identityMocks.assignOrgRoleWithAudit.mockResolvedValue({
			ok: true,
			reactivated: false,
			auditId: "audit-assign-1",
			assignment: {
				id: ASSIGNMENT_ID,
				userId: USER_ID,
				roleId: ROLE_ID,
				scopeType: "organization",
			},
		});

		const formData = new FormData();
		formData.set("userId", USER_ID);
		formData.set("roleId", ROLE_ID);

		const result = await assignOrgRoleAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: {
				assignmentId: ASSIGNMENT_ID,
				userId: USER_ID,
				roleId: ROLE_ID,
				reactivated: false,
				auditId: "audit-assign-1",
			},
		});
		expect(identityMocks.assignOrgRoleWithAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				orgId: "org-n12",
				userId: USER_ID,
				roleId: ROLE_ID,
				grantedBy: "user-n12-operator",
				actorUserId: "user-n12-operator",
			}),
		);
		expect(identityMocks.getOrganizationUser).toHaveBeenCalledWith(
			"org-n12",
			USER_ID,
		);
		expect(auditMocks.recordRbacAudit).not.toHaveBeenCalled();
	});

	it("returns NOT_FOUND for a non-member and never reaches assignOrgRoleWithAudit", async () => {
		identityMocks.getOrganizationUser.mockResolvedValue(null);

		const formData = new FormData();
		formData.set("userId", "outsider-user");
		formData.set("roleId", ROLE_ID);

		const result = await assignOrgRoleAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "NOT_FOUND",
			message: "That user is not an active member of this organization.",
		});
		expect(identityMocks.assignOrgRoleWithAudit).not.toHaveBeenCalled();
	});

	it("returns safe INTERNAL_ERROR when membership directory fails", async () => {
		identityMocks.getOrganizationUser.mockRejectedValue(
			new Error(`directory boom ${secretLeak}`),
		);

		const formData = new FormData();
		formData.set("userId", USER_ID);
		formData.set("roleId", ROLE_ID);

		const result = await assignOrgRoleAction(null, formData);

		expect(result).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
		expect(JSON.stringify(result)).not.toContain("SECRET_PASSWORD");
		expect(JSON.stringify(result)).not.toContain("directory boom");
		expect(identityMocks.assignOrgRoleWithAudit).not.toHaveBeenCalled();
	});

	it("returns safe INTERNAL_ERROR when assign transaction fails", async () => {
		identityMocks.assignOrgRoleWithAudit.mockRejectedValue(
			new Error(`@afenda/db insert failed: ${secretLeak}`),
		);

		const formData = new FormData();
		formData.set("userId", USER_ID);
		formData.set("roleId", ROLE_ID);

		const result = await assignOrgRoleAction(null, formData);

		expect(result).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
		expect(JSON.stringify(result)).not.toContain("SECRET_PASSWORD");
		expect(JSON.stringify(result)).not.toContain("@afenda/db");
	});

	it("returns auditId from DB-atomic revokeOrgRoleWithAudit", async () => {
		identityMocks.revokeOrgRoleWithAudit.mockResolvedValue({
			ok: true,
			auditId: "audit-revoke-1",
			assignment: {
				id: ASSIGNMENT_ID,
				userId: USER_ID,
				roleId: ROLE_ID,
				scopeType: "organization",
			},
		});

		const formData = new FormData();
		formData.set("assignmentId", ASSIGNMENT_ID);

		const result = await revokeOrgRoleAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: {
				assignmentId: ASSIGNMENT_ID,
				userId: USER_ID,
				roleId: ROLE_ID,
				auditId: "audit-revoke-1",
			},
		});
		expect(identityMocks.revokeOrgRoleWithAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				orgId: "org-n12",
				assignmentId: ASSIGNMENT_ID,
				actorUserId: "user-n12-operator",
			}),
		);
		expect(auditMocks.recordRbacAudit).not.toHaveBeenCalled();
	});

	it("returns safe INTERNAL_ERROR when revoke transaction fails", async () => {
		identityMocks.revokeOrgRoleWithAudit.mockRejectedValue(
			new Error(`Neon Auth cookie secret leaked: ${secretLeak}`),
		);

		const formData = new FormData();
		formData.set("assignmentId", ASSIGNMENT_ID);

		const result = await revokeOrgRoleAction(null, formData);

		expect(result).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
		expect(JSON.stringify(result)).not.toContain("SECRET_PASSWORD");
		expect(JSON.stringify(result)).not.toContain("cookie secret");
	});
});

describe("N12 declaration draft unsafe-error closure", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(clientSession);
		authMocks.getApiSession.mockResolvedValue(clientSession);
		hasPermissionMock.mockResolvedValue(true);
		declarationMocks.isClientOnboardingComplete.mockResolvedValue(true);
	});

	it("maps unexpected draft load failures to safe INTERNAL_ERROR", async () => {
		declarationMocks.getClientDeclarationDraft.mockRejectedValue(
			new Error(`query failed ${secretLeak}`),
		);

		const result = await loadDeclarationDraftAction(ASSIGNMENT_UUID);

		expect(result).toMatchObject({
			ok: false,
			code: "INTERNAL_ERROR",
		});
		expect(JSON.stringify(result)).not.toContain("SECRET_PASSWORD");
		expect(JSON.stringify(result)).not.toContain("postgres://");
	});

	it("maps unexpected draft save failures to safe INTERNAL_ERROR", async () => {
		declarationMocks.saveClientDeclarationDraft.mockRejectedValue(
			new Error(`@afenda/db: ${secretLeak}`),
		);

		const formData = new FormData();
		formData.set("assignmentId", ASSIGNMENT_UUID);
		formData.set("surveyId", SURVEY_UUID);
		formData.set("answer", "yes");
		formData.set("stepIndex", "0");

		const result = await saveDeclarationDraftAction(null, formData);

		expect(result).toMatchObject({
			ok: false,
			code: "INTERNAL_ERROR",
		});
		expect(JSON.stringify(result)).not.toContain("SECRET_PASSWORD");
		expect(JSON.stringify(result)).not.toContain("@afenda/db");
	});
});

/**
 * N12 / GUIDE-017 — join accept is ARCH-023 Tier-1 Neon Auth membership
 * (AcceptInvitationCard). Platform RBAC audit (Tier-2) already attributes
 * `member.invite` at operator invite. Join accept is NOT APPLICABLE for
 * app-side `platform_rbac_audit` writes — do not invent a stub hook Neon UI
 * never calls. `ensure-active-organization` is session cookie sync only.
 */
describe("N12 join accept NOT APPLICABLE (ARCH-023 Tier-1)", () => {
	const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

	function source(relativePath: string): string {
		return readFileSync(path.join(webRoot, relativePath), "utf8");
	}

	it("keeps /join on Neon AcceptInvitationCard without app audit writes", () => {
		const joinShell = source("features/auth/join-shell.tsx");
		const joinPage = source("app/(public)/join/page.tsx");
		const ensureActive = source(
			"app/api/session/ensure-active-organization/route.ts",
		);

		expect(joinShell).toContain("AcceptInvitationCard");
		expect(joinShell).not.toContain("recordRbacAudit");
		expect(joinPage).toContain("JoinShell");
		expect(joinPage).not.toContain("recordRbacAudit");
		expect(ensureActive).toContain("handleEnsureActiveOrganizationRequest");
		expect(ensureActive).not.toContain("recordRbacAudit");
	});

	it("keeps invite cross-system; assign/revoke DB-atomic (no fake invite rollback)", () => {
		const invite = source("app/actions/invite-org-member.ts");
		const assign = source("app/actions/assign-org-role.ts");
		const revoke = source("app/actions/revoke-org-role.ts");
		const assignDomain = source(
			"modules/identity/domain/assign-org-role-audited.ts",
		);
		const revokeDomain = source(
			"modules/identity/domain/revoke-org-role-audited.ts",
		);
		const assignTypes = source("modules/identity/domain/assign-org-role.ts");
		const revokeTypes = source("modules/identity/domain/revoke-org-role.ts");

		expect(invite).toContain("inviteOrgMember");
		expect(invite).toContain("recordRbacAudit");
		expect(invite).not.toContain("runNeonHttpTransaction");

		expect(assign).toContain("assignOrgRoleWithAudit");
		expect(assign).not.toContain("recordRbacAudit");
		expect(revoke).toContain("revokeOrgRoleWithAudit");
		expect(revoke).not.toContain("recordRbacAudit");

		expect(assignDomain).toContain("runNeonHttpTransaction");
		expect(revokeDomain).toContain("runNeonHttpTransaction");

		expect(assignTypes).not.toMatch(/export async function assignOrgRole\b/);
		expect(revokeTypes).not.toMatch(/export async function revokeOrgRole\b/);
	});
});
