import { getSession, inviteableRolesFor, JOIN_PATH } from "@afenda/auth";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";

import { forbidPermissionAccess } from "@/features/auth/require-permission";
import type { MemberDirectoryState } from "@/features/org-admin/assign-org-role-form";
import { InviteMemberForm } from "@/features/org-admin/invite-member-form";
import { OrgAdminPanels } from "@/features/org-admin/org-admin-panels";
import { listAssignableRoles } from "@/modules/identity/domain/list-assignable-roles";
import { listRoleAssignments } from "@/modules/identity/domain/list-role-assignments";
import { listOrganizationUsers } from "@/modules/identity/domain/organization-users";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";
import { listOrgRbacAudit } from "@/modules/platform/domain/list-rbac-audit";

function memberLabel(name: string, email: string): string {
	return `${name} · ${email}`;
}

async function loadMemberDirectory(
	orgId: string,
): Promise<MemberDirectoryState> {
	try {
		const users = await listOrganizationUsers(orgId);
		if (users.length === 0) {
			return { status: "empty", options: [] };
		}
		return {
			status: "ready",
			options: users.map((user) => ({
				id: user.userId,
				label: memberLabel(user.name, user.email),
			})),
		};
	} catch {
		return { status: "unavailable", options: [] };
	}
}

/**
 * Org-admin feature — session-aware RSC load + Identity/Platform domain ports
 * (ARCH-013 · ARCH-028 S7.4 · GUIDE-018 I3.1). Never imports `@afenda/db`.
 * Operator invite → Neon Auth + `recordRbacAudit`; assign/revoke → Identity
 * ports + audit. UI composed exclusively from `@afenda/ui-system` (ADR-010).
 *
 * CAPABLE: invite, assign, revoke, audit View Dialog. No fake CTAs.
 */
export async function OrgAdminShell() {
	const session = await getSession();
	const { orgId, role } = session;
	const [canManageRoles, canInvite] = await Promise.all([
		sessionHasPermission(session, "org.roles.manage"),
		sessionHasPermission(session, "clients.invite"),
	]);

	if (!(canManageRoles || canInvite)) {
		forbidPermissionAccess();
	}

	const [roles, assignments, auditRows, memberDirectory] = canManageRoles
		? await Promise.all([
				listAssignableRoles(orgId),
				listRoleAssignments(orgId),
				listOrgRbacAudit(orgId),
				loadMemberDirectory(orgId),
			])
		: [
				[],
				[],
				[],
				{ status: "unavailable", options: [] } satisfies MemberDirectoryState,
			];

	const inviteableRoles = canInvite ? inviteableRolesFor(role) : [];
	const roleNameById = new Map(roles.map((item) => [item.id, item.name]));
	const activeAssignments = assignments.filter((item) => item.active);

	return (
		<main className="flex min-h-dvh flex-col gap-(--section-gap) bg-canvas p-6">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Operator admin
				</h1>
				<p className="text-sm text-foreground-secondary">
					Org-scoped RBAC shell for{" "}
					<code className="font-mono text-sm text-foreground-tertiary">
						{orgId}
					</code>
					.
				</p>
			</header>

			{canInvite ? (
				<Card>
					<CardHeader>
						<CardTitle>Invite member</CardTitle>
						<CardDescription>
							Neon Auth delivers the invitation email; success also writes an
							org-scoped RBAC audit row. Invitees open{" "}
							<code className="font-mono text-sm text-foreground-tertiary">
								{JOIN_PATH}?invitationId=…
							</code>
							.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<InviteMemberForm
							inviteableRoles={inviteableRoles}
							joinPath={JOIN_PATH}
						/>
					</CardContent>
				</Card>
			) : null}

			{canManageRoles ? (
				<OrgAdminPanels
					roles={roles.map((item) => ({
						id: item.id,
						name: item.name,
						active: item.active,
						isSystemTemplate: item.isSystemTemplate,
					}))}
					assignments={activeAssignments.map((item) => ({
						id: item.id,
						userId: item.userId,
						roleId: item.roleId,
						roleName: roleNameById.get(item.roleId) ?? item.roleId,
						scopeType: item.scopeType,
					}))}
					auditRows={auditRows.map((item) => ({
						id: item.id,
						action: item.action,
						targetType: item.targetType,
					}))}
					memberDirectory={memberDirectory}
				/>
			) : null}
		</main>
	);
}
