import { listOrganizations } from "@afenda/admin";
import { getOrganizationUsageMetrics } from "@afenda/admin/usage";
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
import {
	OrgConsolePanels,
	type OrgListLoadState,
	type UsageLoadState,
} from "@/features/org-admin/org-console-panels";
import { listAssignableRoles } from "@/modules/identity/domain/list-assignable-roles";
import { listRoleAssignments } from "@/modules/identity/domain/list-role-assignments";
import { syncOrganizationMemberSearchIndex } from "@/modules/identity/domain/organization-member-search";
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

/** Serialize domain timestamps for RSC→client props; null when unparseable. */
function toIsoInstantOrNull(
	value: Date | string | null | undefined,
): string | null {
	if (value == null) {
		return null;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	const parsed = Date.parse(value);
	if (Number.isNaN(parsed)) {
		return null;
	}
	return new Date(parsed).toISOString();
}

function toAuditCreatedAtIso(value: Date | string): string {
	return toIsoInstantOrNull(value) ?? String(value);
}

/** Current UTC calendar month `YYYY-MM` for usage RSC load. */
function currentUtcYearMonth(now = new Date()): string {
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}

async function loadMemberDirectory(
	orgId: string,
): Promise<MemberDirectoryState> {
	let users: Awaited<ReturnType<typeof listOrganizationUsers>>;
	try {
		users = await listOrganizationUsers(orgId);
	} catch {
		return { status: "unavailable", options: [] };
	}

	// Warm / prune search index; directory stays available if sync fails.
	try {
		await syncOrganizationMemberSearchIndex(orgId);
	} catch {
		// Index warm is best-effort for first paint.
	}

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
}

/**
 * Justified RSC load for org list — Action unfit for first paint
 * (same pattern as roles/assignments). Mutations use Server Actions.
 */
async function loadOrgList(): Promise<OrgListLoadState> {
	const result = await listOrganizations();
	if (!result.ok) {
		return {
			status: "unavailable",
			organizations: [],
			message: result.message,
		};
	}
	if (result.data.length === 0) {
		return { status: "empty", organizations: [] };
	}
	return {
		status: "ready",
		organizations: result.data.map((org) => ({
			id: org.id,
			slug: org.slug,
			name: org.name ?? null,
			lastActivityAt: toIsoInstantOrNull(org.lastActivityAt),
		})),
	};
}

async function loadUsage(
	orgId: string,
	period: string,
): Promise<UsageLoadState> {
	const result = await getOrganizationUsageMetrics({ orgId, period });
	if (!result.ok) {
		return { status: "unavailable", message: result.message };
	}
	return {
		status: "ready",
		metrics: {
			orgId: result.data.orgId,
			period: result.data.period,
			activeMembers: result.data.activeMembers,
			rbacAuditEvents: result.data.rbacAuditEvents,
			activeRoleAssignments: result.data.activeRoleAssignments,
		},
	};
}

/**
 * Org-admin feature — session-aware RSC load + Identity/Platform domain ports
 * + `@afenda/admin` org-console (ARCH-013 · ARCH-028 S7.4 · GUIDE-018 I3.1).
 * Never imports `@afenda/db`. Fail-closed via `requireRole('operator')` even if
 * composed outside the layout. UI composed exclusively from `@afenda/ui-system`
 * (ADR-010).
 *
 * CAPABLE: org list (RSC) · provision · hard-delete · usage; invite, assign
 * (member-directory Combobox · Sheet), revoke, audit View Dialog, MetricGrid.
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

	const usagePeriod = currentUtcYearMonth();
	const [roles, assignments, auditRows, memberDirectory, orgList, usage] =
		await Promise.all([
			canManageRoles ? listAssignableRoles(orgId) : Promise.resolve([]),
			canManageRoles ? listRoleAssignments(orgId) : Promise.resolve([]),
			canManageRoles ? listOrgRbacAudit(orgId) : Promise.resolve([]),
			canManageRoles
				? loadMemberDirectory(orgId)
				: Promise.resolve({
						status: "unavailable",
						options: [],
					} satisfies MemberDirectoryState),
			loadOrgList(),
			loadUsage(orgId, usagePeriod),
		]);

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
					Org-console and org-scoped RBAC for active org <Code>{orgId}</Code>.
				</p>
			</header>

			<OrgConsolePanels orgList={orgList} usage={usage} activeOrgId={orgId} />

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
						userLabel: resolveAssignmentUserLabel(memberDirectory, item.userId),
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
