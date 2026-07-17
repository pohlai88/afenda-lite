import { inviteableRolesFor, JOIN_PATH, requireRole } from "@afenda/auth";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Code,
	MetricGrid,
} from "@afenda/ui-system";
import { ClipboardList, Shield, Users } from "lucide-react";

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

function resolveAssignmentUserLabel(
	memberDirectory: MemberDirectoryState,
	userId: string,
): string {
	if (memberDirectory.status !== "ready") {
		return userId;
	}
	return (
		memberDirectory.options.find((member) => member.id === userId)?.label ??
		userId
	);
}

function formatAuditJsonValue(value: unknown): string | null {
	if (value == null) {
		return null;
	}
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function toAuditCreatedAtIso(value: Date | string): string {
	if (value instanceof Date) {
		return value.toISOString();
	}
	const parsed = Date.parse(value);
	if (Number.isNaN(parsed)) {
		return value;
	}
	return new Date(parsed).toISOString();
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
 * Fail-closed via `requireRole('operator')` even if composed outside the layout.
 * Operator invite → Neon Auth + `recordRbacAudit`; assign/revoke → Identity
 * ports + audit. UI composed exclusively from `@afenda/ui-system` (ADR-010).
 *
 * CAPABLE: invite, assign (member-directory Combobox · Sheet), revoke, audit
 * View Dialog (full RBAC fields), MetricGrid (I3.4 cut A + cut B polish).
 */
export async function OrgAdminShell() {
	const session = await requireRole("operator");
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
		<main className="flex flex-col gap-(--section-gap)">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Operator admin
				</h1>
				<p className="text-sm text-foreground-secondary">
					Org-scoped RBAC shell for <Code>{orgId}</Code>.
				</p>
			</header>

			{canManageRoles ? (
				<MetricGrid
					columns={3}
					metrics={[
						{
							title: "Assignable roles",
							value: roles.length,
							description: "System templates and org-custom roles",
							icon: <Shield className="size-4" aria-hidden />,
						},
						{
							title: "Active assignments",
							value: activeAssignments.length,
							description: "Current org role bindings",
							icon: <Users className="size-4" aria-hidden />,
						},
						{
							title: "Audit events",
							value: auditRows.length,
							description: "Org-scoped RBAC history",
							icon: <ClipboardList className="size-4" aria-hidden />,
						},
					]}
				/>
			) : null}

			{canInvite ? (
				<Card>
					<CardHeader>
						<CardTitle>Invite member</CardTitle>
						<CardDescription>
							Neon Auth delivers the invitation email; success also writes an
							org-scoped RBAC audit row. Invitees open{" "}
							<Code>{JOIN_PATH}?invitationId=…</Code>.
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
						userLabel: resolveAssignmentUserLabel(
							memberDirectory,
							item.userId,
						),
						roleId: item.roleId,
						roleName: roleNameById.get(item.roleId) ?? item.roleId,
						scopeType: item.scopeType,
					}))}
					auditRows={auditRows.map((item) => ({
						id: item.id,
						action: item.action,
						targetType: item.targetType ?? null,
						targetId: item.targetId ?? null,
						actorUserId: item.actorUserId,
						actorLabel: resolveAssignmentUserLabel(
							memberDirectory,
							item.actorUserId,
						),
						roleId: item.roleId ?? null,
						reason: item.reason ?? null,
						createdAt: toAuditCreatedAtIso(item.createdAt),
						oldValueJson: formatAuditJsonValue(item.oldValue),
						newValueJson: formatAuditJsonValue(item.newValue),
					}))}
					memberDirectory={memberDirectory}
				/>
			) : null}
		</main>
	);
}
