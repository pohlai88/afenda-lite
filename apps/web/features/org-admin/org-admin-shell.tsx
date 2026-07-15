import { getSession, inviteableRolesFor, JOIN_PATH } from "@afenda/auth";

import { InviteMemberForm } from "@/features/org-admin/invite-member-form";
import { listOrgRoles } from "@/modules/identity/domain/list-org-roles";
import { listRoleAssignments } from "@/modules/identity/domain/list-role-assignments";
import { listOrgRbacAudit } from "@/modules/platform/domain/list-rbac-audit";

/**
 * Org-admin feature — session-aware RSC load + Identity/Platform domain ports
 * (ARCH-013 · ARCH-028 S7.4). Never imports `@afenda/db`.
 * Operator invite → Neon Auth + `recordRbacAudit` (GUIDE-018 I1.3 / I2.3).
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
		<main className="flex min-h-dvh flex-col gap-8 p-8">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Operator admin
				</h1>
				<p className="text-muted-foreground">
					Org-scoped RBAC shell for{" "}
					<code className="text-foreground">{orgId}</code>.
				</p>
			</header>

			<section
				className="flex flex-col gap-3"
				aria-labelledby="org-invite-heading"
			>
				<h2 id="org-invite-heading" className="text-lg font-medium">
					Invite member
				</h2>
				<p className="text-sm text-muted-foreground">
					Neon Auth delivers the invitation email; success also writes an
					org-scoped RBAC audit row. Invitees open{" "}
					<code className="text-foreground">{JOIN_PATH}?invitationId=…</code>.
				</p>
				<InviteMemberForm
					inviteableRoles={inviteableRoles}
					joinPath={JOIN_PATH}
				/>
			</section>

			<section
				className="flex flex-col gap-3"
				aria-labelledby="org-roles-heading"
			>
				<h2 id="org-roles-heading" className="text-lg font-medium">
					Roles ({roles.length})
				</h2>
				{roles.length === 0 ? (
					<p className="text-sm text-muted-foreground">No org roles yet.</p>
				) : (
					<ul className="list-inside list-disc text-sm">
						{roles.map((role) => (
							<li key={role.id}>
								{role.name}
								{role.active ? "" : " (inactive)"}
							</li>
						))}
					</ul>
				)}
			</section>

			<section
				className="flex flex-col gap-3"
				aria-labelledby="org-assignments-heading"
			>
				<h2 id="org-assignments-heading" className="text-lg font-medium">
					Role assignments ({assignments.length})
				</h2>
				{assignments.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No role assignments yet.
					</p>
				) : (
					<ul className="list-inside list-disc text-sm">
						{assignments.map((row) => (
							<li key={row.id}>
								<code>{row.userId}</code> → role <code>{row.roleId}</code> (
								{row.scopeType})
							</li>
						))}
					</ul>
				)}
			</section>

			<section
				className="flex flex-col gap-3"
				aria-labelledby="org-audit-heading"
			>
				<h2 id="org-audit-heading" className="text-lg font-medium">
					RBAC audit ({auditRows.length})
				</h2>
				{auditRows.length === 0 ? (
					<p className="text-sm text-muted-foreground">No audit rows yet.</p>
				) : (
					<ul className="list-inside list-disc text-sm">
						{auditRows.map((row) => (
							<li key={row.id}>
								{row.action}
								{row.targetType ? ` · ${row.targetType}` : ""}
							</li>
						))}
					</ul>
				)}
			</section>
		</main>
	);
}
