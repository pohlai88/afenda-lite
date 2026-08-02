import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors";

import type { MutationPorts } from "./ports";

export interface PayrollAuditRecordInput {
	action: "CREATE" | "UPDATE" | "DELETE";
	actorUserId: string;
	changes?: Change[];
	correlationId: string;
	entity: string;
	entityId: string;
	organizationId: string;
}

export function recordPayrollAudit(
	ports: MutationPorts,
	input: PayrollAuditRecordInput,
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: input.changes ?? [],
	});
}
