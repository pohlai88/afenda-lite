import { randomUUID } from "node:crypto";

import type { Result } from "@afenda/errors/result";

import type {
	AuditFactInput,
	MutationPorts,
} from "../mutation-ports";
import type { CorporateAdministrationMutationMeta } from "../store/company-store";
import type {
	CorporateAdministrationAggregateType,
	CorporateAdministrationAuditFact,
	CorporateAdministrationOutboxEvent,
	CorporateAdministrationUnitOfWorkContext,
} from "../unit-of-work";

export type CompanyRegistryFactsInput = {
	readonly aggregateType: CorporateAdministrationAggregateType;
	readonly aggregateId: string;
	readonly legalCompanyId: string;
	readonly action: string;
	readonly beforeVersion: number | null;
	readonly afterVersion: number;
	readonly changedFields?: readonly string[];
	readonly code: string;
	readonly status: string;
};

export function materializeCompanyRegistryFacts(
	meta: CorporateAdministrationMutationMeta,
	input: CompanyRegistryFactsInput,
): {
	readonly audit: CorporateAdministrationAuditFact;
	readonly outbox: CorporateAdministrationOutboxEvent;
} {
	return {
		audit: buildCompanyRegistryAuditFact({
			meta,
			aggregateType: input.aggregateType,
			aggregateId: input.aggregateId,
			action: input.action,
			beforeVersion: input.beforeVersion,
			afterVersion: input.afterVersion,
			changedFields: input.changedFields,
		}),
		outbox: buildCompanyRegistryOutboxEvent({
			meta,
			aggregateType: input.aggregateType,
			aggregateId: input.aggregateId,
			legalCompanyId: input.legalCompanyId,
			aggregateVersion: input.afterVersion,
			status: input.status,
			code: input.code,
		}),
	};
}

export async function appendCompanyRegistryFacts(
	context: CorporateAdministrationUnitOfWorkContext,
	meta: CorporateAdministrationMutationMeta,
	input: CompanyRegistryFactsInput,
): Promise<{
	readonly audit: CorporateAdministrationAuditFact;
	readonly outbox: CorporateAdministrationOutboxEvent;
}> {
	const { audit, outbox } = materializeCompanyRegistryFacts(meta, input);
	await context.audit.append(audit);
	await context.outbox.append(outbox);
	return { audit, outbox };
}

export function buildLegalCompanyOutboxPayload(input: {
	readonly organizationId: string;
	readonly legalCompanyId: string;
	readonly code: string;
	readonly version: number;
	readonly actorUserId: string;
	readonly correlationId: string;
	readonly status: string;
}): Record<string, unknown> {
	return {
		organizationId: input.organizationId,
		entityType: "legal_company",
		entityId: input.legalCompanyId,
		code: input.code,
		version: input.version,
		actorId: input.actorUserId,
		correlationId: input.correlationId,
		status: input.status,
	};
}

export async function recordCompanyRegistryFactsViaPorts(
	ports: MutationPorts,
	meta: CorporateAdministrationMutationMeta,
	input: CompanyRegistryFactsInput,
	entityValue?: Record<string, unknown>,
	oldEntityValue?: Record<string, unknown>,
): Promise<Result<{ auditId: string; eventId: string }>> {
	const action = input.action === "CREATE" ? "CREATE" : "UPDATE";
	return recordCompanyRegistryMutation(
		ports,
		meta,
		{
			entity: input.aggregateType,
			entityId: input.aggregateId,
			action,
			changes: [],
			...(oldEntityValue === undefined ? {} : { oldValue: oldEntityValue }),
			...(entityValue === undefined ? {} : { newValue: entityValue }),
		},
		buildLegalCompanyOutboxPayload({
			organizationId: meta.organizationId,
			legalCompanyId: input.legalCompanyId,
			code: input.code,
			version: input.afterVersion,
			actorUserId: meta.actorUserId,
			correlationId: meta.correlationId,
			status: input.status,
		}),
	);
}

export async function recordCompanyRegistryMutation(
	ports: MutationPorts,
	meta: CorporateAdministrationMutationMeta,
	audit: Pick<
		AuditFactInput,
		"entity" | "entityId" | "action" | "changes" | "oldValue" | "newValue"
	>,
	outboxPayload: Record<string, unknown>,
): Promise<Result<{ auditId: string; eventId: string }>> {
	return ports.record({
		audit: {
			organizationId: meta.organizationId,
			actorUserId: meta.actorUserId,
			correlationId: meta.correlationId,
			...audit,
		},
		outbox: {
			organizationId: meta.organizationId,
			actorUserId: meta.actorUserId,
			correlationId: meta.correlationId,
			type: meta.eventType,
			payload: outboxPayload,
		},
	});
}

export function buildCompanyRegistryAuditFact(input: {
	readonly meta: CorporateAdministrationMutationMeta;
	readonly aggregateType: CorporateAdministrationAggregateType;
	readonly aggregateId: string;
	readonly action: string;
	readonly beforeVersion: number | null;
	readonly afterVersion: number | null;
	readonly changedFields?: readonly string[];
}): CorporateAdministrationAuditFact {
	return {
		organizationId: input.meta.organizationId,
		actorUserId: input.meta.actorUserId,
		commandId: input.meta.idempotencyKey,
		aggregateType: input.aggregateType,
		aggregateId: input.aggregateId,
		correlationId: input.meta.correlationId,
		causationId: input.meta.causationId,
		action: input.action,
		beforeVersion: input.beforeVersion,
		afterVersion: input.afterVersion,
		changedFields: input.changedFields ?? [],
		occurredAt: input.meta.occurredAt,
	};
}

export function buildCompanyRegistryOutboxEvent(input: {
	readonly meta: CorporateAdministrationMutationMeta;
	readonly aggregateType: CorporateAdministrationAggregateType;
	readonly aggregateId: string;
	readonly legalCompanyId: string;
	readonly aggregateVersion: number;
	readonly status: string;
	readonly code?: string;
	readonly eventId?: string;
}): CorporateAdministrationOutboxEvent {
	const code = input.code ?? input.meta.legalCompanyCode ?? "";
	return {
		id: input.eventId ?? randomUUID(),
		eventName: input.meta.eventType,
		eventVersion: 1,
		organizationId: input.meta.organizationId,
		legalCompanyId: input.legalCompanyId,
		aggregateType: input.aggregateType,
		aggregateId: input.aggregateId,
		aggregateVersion: input.aggregateVersion,
		actorUserId: input.meta.actorUserId,
		correlationId: input.meta.correlationId,
		causationId: input.meta.causationId,
		occurredAt: input.meta.occurredAt,
		payload: {
			organizationId: input.meta.organizationId,
			entityType: "legal_company",
			entityId: input.legalCompanyId,
			code,
			version: input.aggregateVersion,
			actorId: input.meta.actorUserId,
			correlationId: input.meta.correlationId,
			status: input.status,
		},
	};
}
