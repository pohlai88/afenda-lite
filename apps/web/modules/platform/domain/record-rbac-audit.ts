import { and, db, eq, platformRbacAudit } from "@afenda/db";

import { requireTrimmed } from "@/modules/platform/domain/require-trimmed";

/** Audit action stamped when an operator invitation succeeds (GUIDE-018 I2.3). */
export const MEMBER_INVITE_AUDIT_ACTION = "member.invite" as const;

/** Audit actions for platform role assignment mutations (GUIDE-018 I3.1). */
export const ROLE_ASSIGN_AUDIT_ACTION = "role.assign" as const;
export const ROLE_REVOKE_AUDIT_ACTION = "role.revoke" as const;

export type RecordRbacAuditCommand = {
	/** Active session organization — must be stamped on the row (ARCH-023). */
	orgId: string;
	action: string;
	actorUserId: string;
	/** API-007 — required on new privileged writes (GUIDE-018 I5.3). */
	correlationId: string;
	targetType?: string;
	targetId?: string;
	roleId?: string;
	oldValue?: Record<string, unknown>;
	newValue?: Record<string, unknown>;
	reason?: string;
};

/**
 * Platform — authenticated tenant write: insert `platform_rbac_audit` with
 * explicit `organization_id` (never ambient, never soft NULL). Callers are
 * adapters that already established session org (ARCH-023 · ARCH-029 §3.3 #8).
 */
export async function recordRbacAudit(command: RecordRbacAuditCommand) {
	const orgId = requireTrimmed(command.orgId, "orgId", "recordRbacAudit");
	const actorUserId = requireTrimmed(
		command.actorUserId,
		"actorUserId",
		"recordRbacAudit",
	);
	const action = requireTrimmed(command.action, "action", "recordRbacAudit");
	const correlationId = requireTrimmed(
		command.correlationId,
		"correlationId",
		"recordRbacAudit",
	);

	const [row] = await db
		.insert(platformRbacAudit)
		.values({
			action,
			actorUserId,
			organizationId: orgId,
			correlationId,
			targetType: command.targetType,
			targetId: command.targetId,
			roleId: command.roleId,
			oldValue: command.oldValue,
			newValue: command.newValue,
			reason: command.reason,
		})
		.returning();

	if (!row) {
		throw new Error("recordRbacAudit insert returned no row");
	}

	return row;
}

/**
 * Hard-tenancy delete — both `id` and `organization_id` must match (ARCH-023).
 */
export async function deleteRbacAuditRow(input: { id: string; orgId: string }) {
	const orgId = requireTrimmed(input.orgId, "orgId", "deleteRbacAuditRow");
	const id = requireTrimmed(input.id, "id", "deleteRbacAuditRow");

	const [row] = await db
		.delete(platformRbacAudit)
		.where(
			and(
				eq(platformRbacAudit.id, id),
				eq(platformRbacAudit.organizationId, orgId),
			),
		)
		.returning();

	return row ?? null;
}
