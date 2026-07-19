/**
 * Platform general activity audit for org hard-delete.
 * Writes `platform_audit_log` via `@afenda/audit` — not RBAC (`platform_rbac_audit`).
 */

import {
	type AuditEntry,
	createAuditRecorder,
	type RecordAuditCommand,
} from "@afenda/audit";
import type { Result } from "@afenda/errors/result";

import { readRequestAttribution } from "@/modules/platform/domain/request-attribution";

export type RecordOrganizationDeletedAuditInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
};

const ORGANIZATION_DELETE_AUDIT = {
	module: "platform",
	entity: "organization",
	action: "DELETE",
} as const satisfies Pick<RecordAuditCommand, "module" | "entity" | "action">;

/**
 * Record that an organization was hard-deleted. Call only after Neon delete
 * succeeds. Stamps request IP / UA when available.
 */
export async function recordOrganizationDeletedAudit(
	input: RecordOrganizationDeletedAuditInput,
): Promise<Result<AuditEntry>> {
	const attribution = await readRequestAttribution();
	const { organizationId } = input;

	return createAuditRecorder().record({
		organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: ORGANIZATION_DELETE_AUDIT.module,
		entity: ORGANIZATION_DELETE_AUDIT.entity,
		entityId: organizationId,
		action: ORGANIZATION_DELETE_AUDIT.action,
		oldValue: { orgId: organizationId },
		newValue: null,
		ipAddress: attribution.ipAddress,
		userAgent: attribution.userAgent,
	});
}
