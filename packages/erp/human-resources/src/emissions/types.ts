import type { HumanResourcesEventType } from "@afenda/events";

import type { HumanResourcesCommandId } from "../module-ids";

export type HumanResourcesEmissionMode = "audit_only" | "domain_event";

export type HumanResourcesDomain =
	| "workforce-foundation"
	| "employment-lifecycle"
	| "core"
	| "organization"
	| "recruitment"
	| "leave"
	| "time"
	| "compensation-benefits"
	| "performance"
	| "learning"
	| "talent"
	| "compliance"
	| "employee-relations"
	| "workforce-planning"
	| "privacy";

interface HumanResourcesEmissionBase {
	aggregateType: string;
	auditRequired: true;
	commandId: HumanResourcesCommandId;
	correlationRequired: true;
	domain: HumanResourcesDomain;
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
