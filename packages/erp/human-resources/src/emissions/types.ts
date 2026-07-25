import type { HumanResourcesEventType } from "@afenda/events";

import type { HumanResourcesCommandId } from "../module-ids";

export type HumanResourcesEmissionMode = "audit_only" | "domain_event";

export type HumanResourcesDomain =
	| "workforce-foundation"
	| "core"
	| "organization"
	| "recruitment"
	| "lifecycle"
	| "leave"
	| "time"
	| "compensation-benefits"
	| "performance"
	| "learning"
	| "talent"
	| "compliance"
	| "employee-relations"
	| "workforce-planning";

interface HumanResourcesEmissionBase {
	commandId: HumanResourcesCommandId;
	auditRequired: true;
	correlationRequired: true;
	domain: HumanResourcesDomain;
	aggregateType: string;
}

export interface HumanResourcesAuditOnlyEmission
	extends HumanResourcesEmissionBase {
	emissionMode: "audit_only";
	eventTypes: readonly [];
}

export interface HumanResourcesDomainEventEmission
	extends HumanResourcesEmissionBase {
	emissionMode: "domain_event";
	eventTypes: readonly [HumanResourcesEventType, ...HumanResourcesEventType[]];
}

export type HumanResourcesMutationEmissionDefinition =
	| HumanResourcesAuditOnlyEmission
	| HumanResourcesDomainEventEmission;

export type HumanResourcesEmissionRegistry = Partial<
	Record<HumanResourcesCommandId, HumanResourcesMutationEmissionDefinition>
>;
