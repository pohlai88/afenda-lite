import type { Result } from "@afenda/errors/result";
import type { CorporateAdministrationEventType } from "@afenda/events/schemas";

import type { MutationPorts } from "../ports";

export type GovernanceEntityType =
	| "officer_appointment"
	| "governance_body"
	| "governance_membership"
	| "authority_mandate"
	| "company_premise"
	| "governance_meeting"
	| "resolution";

export type GovernanceMutationMeta = {
	correlationId: string;
	eventType: CorporateAdministrationEventType;
};

export type GovernanceFactInput = {
	organizationId: string;
	legalCompanyId: string;
	entityType: GovernanceEntityType;
	entityId: string;
	version: number;
	actorUserId: string;
	status: string;
	action: "CREATE" | "UPDATE";
	auditEntity: string;
	newValue: Record<string, unknown>;
	oldValue?: Record<string, unknown>;
	effectiveFrom?: string;
	effectiveTo?: string | null;
	supersedesId?: string | null;
};

function buildOutboxPayload(input: GovernanceFactInput, correlationId: string) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		entityType: input.entityType,
		entityId: input.entityId,
		version: input.version,
		actorId: input.actorUserId,
		correlationId,
		status: input.status,
		...(input.effectiveFrom !== undefined
			? { effectiveFrom: input.effectiveFrom }
			: {}),
		...(input.effectiveTo !== undefined
			? { effectiveTo: input.effectiveTo }
			: {}),
		...(input.supersedesId !== undefined
			? { supersedesId: input.supersedesId }
			: {}),
	};
}

export async function recordGovernanceFacts(
	ports: MutationPorts,
	meta: GovernanceMutationMeta,
	input: GovernanceFactInput,
): Promise<Result<{ auditId: string; eventId: string }>> {
	return ports.record({
		audit: {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: input.auditEntity,
			entityId: input.entityId,
			action: input.action,
			changes: [],
			...(input.oldValue !== undefined ? { oldValue: input.oldValue } : {}),
			newValue: input.newValue,
		},
		outbox: {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			type: meta.eventType,
			payload: buildOutboxPayload(input, meta.correlationId),
		},
	});
}
