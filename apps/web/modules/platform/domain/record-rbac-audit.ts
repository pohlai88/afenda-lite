import { and, db, eq, platformRbacAudit } from "@afenda/db";

/** Audit action stamped when an operator invitation succeeds (GUIDE-018 I2.3). */
export const MEMBER_INVITE_AUDIT_ACTION = "member.invite" as const;

export type RecordRbacAuditCommand = {
	/** Active session organization — must be stamped on the row (ARCH-023). */
	orgId: string;
	action: string;
	actorUserId: string;
	targetType?: string;
	targetId?: string;
	newValue?: Record<string, unknown>;
	reason?: string;
};

function requireTrimmed(value: string, field: string, context: string): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw new Error(`${context} requires non-empty ${field}`);
	}
	return trimmed;
}

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

	const [row] = await db
		.insert(platformRbacAudit)
		.values({
			action,
			actorUserId,
			organizationId: orgId,
			targetType: command.targetType,
			targetId: command.targetId,
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
