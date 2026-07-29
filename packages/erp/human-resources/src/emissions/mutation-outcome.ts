import type { Change } from "@afenda/audit";
import { ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesEventType } from "@afenda/events";

import type { HumanResourcesCommandId } from "../module-ids";
import type { MutationPorts } from "../ports";
import type { HumanResourcesMutationExecutionMeta } from "../shared/mutation-meta";

import { getHumanResourcesMutationEmission } from "./resolve-emission";

export type HumanResourcesMutationOutcome = {
	commandId: HumanResourcesCommandId;
	meta: HumanResourcesMutationExecutionMeta;
	aggregateType: string;
	aggregateId: string;
	audit: {
		entity: string;
		entityId?: string | undefined;
		action: "CREATE" | "UPDATE" | "DELETE";
		changes: readonly Change[];
		oldValue?: Record<string, unknown> | null | undefined;
		newValue?: Record<string, unknown> | null | undefined;
	};
	event?:
		| {
				type: HumanResourcesEventType;
				payload: Readonly<Record<string, unknown>>;
				entityId?: string | undefined;
				entityType?: string | undefined;
		  }
		| undefined;
	/** Runtime-conditional paths that audit without emitting a declared domain event. */
	conditionalEventSuppressed?: boolean | undefined;
};

export type PlannedHumanResourcesMutationOutcome = {
	definition: ReturnType<typeof getHumanResourcesMutationEmission>;
	auditInput: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
		changes: Change[];
		oldValue?: Record<string, unknown> | null | undefined;
		newValue?: Record<string, unknown> | null | undefined;
	};
	outboxInput?:
		| {
				organizationId: string;
				actorUserId: string;
				correlationId: string;
				type: HumanResourcesEventType;
				payload: Record<string, unknown>;
		  }
		| undefined;
};

const AGGREGATE_ENTITY_MAP: Record<string, string> = {
	leave_policy: "hr_leave_policy",
	leave_entitlement: "hr_leave_entitlement",
	leave_request: "hr_leave_request",
	leave_adjustment: "hr_leave_adjustment",
	requisition: "hr_job_requisition",
	candidate: "hr_candidate",
	application: "hr_candidate_application",
	interview: "hr_interview",
	offer: "hr_employment_offer",
};

export function aggregateTypeToEntity(aggregateType: string): string {
	return AGGREGATE_ENTITY_MAP[aggregateType] ?? aggregateType;
}

export function assertValidHumanResourcesMutationExecutionMeta(
	meta: HumanResourcesMutationExecutionMeta,
): void {
	if (!meta.organizationId.trim()) {
		throw new Error("Human Resources mutation organizationId is required.");
	}
	if (!meta.operationId.trim()) {
		throw new Error("Human Resources mutation operationId is required.");
	}
	if (!meta.correlationId.trim()) {
		throw new Error("Human Resources mutation correlationId is required.");
	}
	if (!meta.actorUserId.trim()) {
		throw new Error("Human Resources mutation actorUserId is required.");
	}
	if (!meta.idempotencyKey?.trim()) {
		throw new Error(
			"Human Resources mutation idempotencyKey is required at emission boundary.",
		);
	}
	if (!meta.requestedAt.trim()) {
		throw new Error("Human Resources mutation requestedAt is required.");
	}
}

export function validateHumanResourcesMutationOutcome(
	outcome: HumanResourcesMutationOutcome,
): void {
	assertValidHumanResourcesMutationExecutionMeta(outcome.meta);

	const definition = getHumanResourcesMutationEmission(outcome.commandId);

	if (definition.aggregateType !== outcome.aggregateType) {
		throw new Error(
			[
				"HR mutation aggregate mismatch.",
				`Command: ${outcome.commandId}`,
				`Expected: ${definition.aggregateType}`,
				`Received: ${outcome.aggregateType}`,
			].join(" "),
		);
	}

	if (definition.emissionMode === "audit_only" && outcome.event) {
		throw new Error(
			`${outcome.commandId} is audit-only and cannot emit ${outcome.event.type}.`,
		);
	}

	if (
		definition.emissionMode === "domain_event" &&
		!outcome.event &&
		!outcome.conditionalEventSuppressed
	) {
		throw new Error(`${outcome.commandId} requires a domain event.`);
	}

	if (
		outcome.event &&
		definition.emissionMode === "domain_event" &&
		!definition.eventTypes.includes(outcome.event.type)
	) {
		throw new Error(
			[
				`Undeclared HR event ${outcome.event.type}.`,
				`Command: ${outcome.commandId}.`,
				`Allowed: ${definition.eventTypes.join(", ")}.`,
			].join(" "),
		);
	}
}

function buildDefaultOutboxPayload(input: {
	organizationId: string;
	entityType: string;
	entityId: string;
	actorUserId: string;
	correlationId: string;
	operationId: string;
}): Record<string, unknown> {
	return {
		organizationId: input.organizationId,
		entityType: input.entityType,
		entityId: input.entityId,
		actorId: input.actorUserId,
		correlationId: input.correlationId,
		operation: input.operationId,
	};
}

export function planHumanResourcesMutationOutcome(
	outcome: HumanResourcesMutationOutcome,
): PlannedHumanResourcesMutationOutcome {
	validateHumanResourcesMutationOutcome(outcome);

	const definition = getHumanResourcesMutationEmission(outcome.commandId);
	const entity =
		outcome.audit.entity || aggregateTypeToEntity(outcome.aggregateType);
	const auditEntityId = outcome.audit.entityId ?? outcome.aggregateId;

	const auditInput = {
		organizationId: outcome.meta.organizationId,
		actorUserId: outcome.meta.actorUserId,
		correlationId: outcome.meta.correlationId,
		entity,
		entityId: auditEntityId,
		action: outcome.audit.action,
		changes: [...outcome.audit.changes],
		oldValue: outcome.audit.oldValue,
		newValue: outcome.audit.newValue,
	};

	const planned: PlannedHumanResourcesMutationOutcome = {
		definition,
		auditInput,
	};

	if (outcome.event) {
		const eventEntityType = outcome.event.entityType ?? entity;
		const eventEntityId = outcome.event.entityId ?? outcome.aggregateId;
		planned.outboxInput = {
			organizationId: outcome.meta.organizationId,
			actorUserId: outcome.meta.actorUserId,
			correlationId: outcome.meta.correlationId,
			type: outcome.event.type,
			payload: {
				...buildDefaultOutboxPayload({
					organizationId: outcome.meta.organizationId,
					entityType: eventEntityType,
					entityId: eventEntityId,
					actorUserId: outcome.meta.actorUserId,
					correlationId: outcome.meta.correlationId,
					operationId: outcome.meta.operationId,
				}),
				...outcome.event.payload,
			},
		};
	}

	return planned;
}

export async function emitHumanResourcesMutationOutcome(
	outcome: HumanResourcesMutationOutcome,
	ports: MutationPorts,
): Promise<Result<void>> {
	const planned = planHumanResourcesMutationOutcome(outcome);

	const audit = await ports.audit.record(planned.auditInput);
	if (!audit.ok) {
		return audit;
	}

	if (!planned.outboxInput) {
		return ok(undefined);
	}

	const outbox = await ports.outbox.append(planned.outboxInput);
	if (!outbox.ok) {
		return outbox;
	}

	return ok(undefined);
}
