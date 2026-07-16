import { getSession, inviteableRolesFor, JOIN_PATH } from "@afenda/auth";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";

import { InviteMemberForm } from "@/features/org-admin/invite-member-form";
import { OrgAdminPanels } from "@/features/org-admin/org-admin-panels";
import { listOrgRoles } from "@/modules/identity/domain/list-org-roles";
import { listRoleAssignments } from "@/modules/identity/domain/list-role-assignments";
import { listOrgRbacAudit } from "@/modules/platform/domain/list-rbac-audit";

/**
 * Org-admin feature — session-aware RSC load + Identity/Platform domain ports
 * (ARCH-013 · ARCH-028 S7.4). Never imports `@afenda/db`.
 * Operator invite → Neon Auth + `recordRbacAudit` (GUIDE-018 I1.3 / I2.3).
 * UI composed exclusively from `@afenda/ui-system` (ADR-010).
 */
export async function OrgAdminShell() {
	const session = await getSession();
	const { orgId, role } = session;
	const inviteableRoles = inviteableRolesFor(role);
	const [roles, assignments, auditRows] = await Promise.all([
		listOrgRoles(orgId),
		listRoleAssignments(orgId),
		listOrgRbacAudit(orgId),
	]);

	return (
		<main className="flex min-h-dvh flex-col gap-(--section-gap) bg-canvas p-6">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Operator admin
				</h1>
				<p className="text-sm text-foreground-secondary">
					Org-scoped RBAC shell for{" "}
					<code className="font-mono text-foreground">{orgId}</code>.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Invite member</CardTitle>
					<CardDescription>
						Neon Auth delivers the invitation email; success also writes an
						org-scoped RBAC audit row. Invitees open{" "}
						<code className="text-foreground">{JOIN_PATH}?invitationId=…</code>.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<InviteMemberForm
						inviteableRoles={inviteableRoles}
						joinPath={JOIN_PATH}
					/>
				</CardContent>
			</Card>

			<OrgAdminPanels
				roles={roles.map((item) => ({
					id: item.id,
					name: item.name,
					active: item.active,
				}))}
				assignments={assignments.map((item) => ({
					id: item.id,
					userId: item.userId,
					roleId: item.roleId,
					scopeType: item.scopeType,
				}))}
				auditRows={auditRows.map((item) => ({
					id: item.id,
					action: item.action,
					targetType: item.targetType,
				}))}
			/>
		</main>
	);
}
