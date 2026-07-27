export const LIFECYCLE_FAMILIES = [
	"operational_master",
	"simple_master",
	"effective_dated",
	"governance_workflow",
] as const;
export type LifecycleFamily = (typeof LIFECYCLE_FAMILIES)[number];

export const OPERATIONAL_MASTER_STATES = [
	"draft",
	"active",
	"inactive",
	"blocked",
	"retired",
	"archived",
	"merged",
] as const;
export type OperationalMasterState = (typeof OPERATIONAL_MASTER_STATES)[number];

export const OPERATIONAL_MASTER_STATE_MEANINGS = {
	draft: "Incomplete or not approved for operational use",
	active: "Available for permitted operational use",
	inactive: "Temporarily unavailable for new use; may be restored",
	blocked: "Explicitly prohibited because of risk, compliance, or governance",
	retired: "Permanently withdrawn from future operational use",
	archived: "Removed from normal working views; retained historically",
	merged: "Superseded by a canonical master record",
} as const satisfies Record<OperationalMasterState, string>;

export const OPERATIONAL_MASTER_RECOMMENDED_AGGREGATES = [
	"party",
	"item",
	"warehouse",
	"item_variant",
] as const;
export type OperationalMasterRecommendedAggregate =
	(typeof OPERATIONAL_MASTER_RECOMMENDED_AGGREGATES)[number];

export const SIMPLE_MASTER_STATES = [
	"draft",
	"active",
	"inactive",
	"archived",
] as const;
export type SimpleMasterState = (typeof SIMPLE_MASTER_STATES)[number];

export const SIMPLE_MASTER_STATE_MEANINGS = {
	draft: "Incomplete or not approved for use",
	active: "Available for permitted assignment or use",
	inactive: "Temporarily unavailable for new assignment; may be restored",
	archived: "Removed from normal working views; retained historically",
} as const satisfies Record<SimpleMasterState, string>;

export const SIMPLE_MASTER_RECOMMENDED_AGGREGATES = [
	"organization_dimension",
	"item_group",
	"payment_term",
] as const;
export type SimpleMasterRecommendedAggregate =
	(typeof SIMPLE_MASTER_RECOMMENDED_AGGREGATES)[number];

export const EFFECTIVE_DATED_STATES = [
	"draft",
	"active",
	"inactive",
	"expired",
	"revoked",
	"archived",
] as const;
export type EffectiveDatedState = (typeof EFFECTIVE_DATED_STATES)[number];

export const EFFECTIVE_DATED_STATE_MEANINGS = {
	draft: "Incomplete or not approved for effective use",
	active:
		"Approved and available when the effective range includes the as-of instant",
	inactive: "Temporarily unavailable for new effective use",
	expired: "No longer effective because its approved effective range has ended",
	revoked: "Explicitly withdrawn before ordinary expiry",
	archived: "Removed from normal working views; retained historically",
} as const satisfies Record<EffectiveDatedState, string>;

export const EFFECTIVE_DATED_RECOMMENDED_AGGREGATES = [
	"tax_registration",
	"party_role",
	"party_address",
	"party_contact",
	"party_external_id",
	"party_relationship",
] as const;
export type EffectiveDatedRecommendedAggregate =
	(typeof EFFECTIVE_DATED_RECOMMENDED_AGGREGATES)[number];

export const GOVERNANCE_WORKFLOW_STATES = [
	"draft",
	"submitted",
	"approved",
	"rejected",
	"applying",
	"applied",
	"failed",
	"cancelled",
	"expired",
	"superseded",
] as const;
export type GovernanceWorkflowState =
	(typeof GOVERNANCE_WORKFLOW_STATES)[number];

export const GOVERNANCE_WORKFLOW_STATE_MEANINGS = {
	draft: "Workflow work item is being prepared and has not been submitted",
	submitted: "Workflow work item is waiting for review or approval",
	approved: "Workflow work item is approved for a governed apply attempt",
	rejected: "Workflow work item was reviewed and rejected",
	applying: "Workflow work item is currently being applied",
	applied: "Workflow work item was successfully applied",
	failed: "Workflow work item apply attempt failed",
	cancelled: "Workflow work item was cancelled before completion",
	expired: "Workflow work item is no longer valid for application",
	superseded: "Workflow work item was replaced by another governance record",
} as const satisfies Record<GovernanceWorkflowState, string>;

export const GOVERNANCE_WORKFLOW_RECOMMENDED_AGGREGATES = [
	"change_request",
	"import_batch",
	"merge_request",
] as const;
export type GovernanceWorkflowRecommendedAggregate =
	(typeof GOVERNANCE_WORKFLOW_RECOMMENDED_AGGREGATES)[number];

export const LIFECYCLE_FAMILY_STATES = {
	operational_master: OPERATIONAL_MASTER_STATES,
	simple_master: SIMPLE_MASTER_STATES,
	effective_dated: EFFECTIVE_DATED_STATES,
	governance_workflow: GOVERNANCE_WORKFLOW_STATES,
} as const satisfies Record<LifecycleFamily, readonly string[]>;

export type LifecycleState =
	| OperationalMasterState
	| SimpleMasterState
	| EffectiveDatedState
	| GovernanceWorkflowState;

export const HISTORICALLY_RESOLVABLE_LIFECYCLE_STATES = [
	"draft",
	"active",
	"inactive",
	"blocked",
	"retired",
	"archived",
	"merged",
	"expired",
	"revoked",
] as const;
export type HistoricallyResolvableLifecycleState =
	(typeof HISTORICALLY_RESOLVABLE_LIFECYCLE_STATES)[number];

export const HISTORICAL_IDENTITY_PRESERVED_EVIDENCE = [
	"identifiers",
	"historical_names",
	"external_ids",
	"audit_evidence",
	"prior_transactional_references",
	"merge_lineage",
] as const;
export type HistoricalIdentityPreservedEvidence =
	(typeof HISTORICAL_IDENTITY_PRESERVED_EVIDENCE)[number];

export const HISTORICAL_IDENTITY_RESOLUTION_MODES = [
	"exact_identity",
	"canonical_identity",
] as const;
export type HistoricalIdentityResolutionMode =
	(typeof HISTORICAL_IDENTITY_RESOLUTION_MODES)[number];

export const LIFECYCLE_AVAILABILITY_FACETS = [
	"exists",
	"historically_resolvable",
	"active",
	"operationally_selectable",
	"canonical",
] as const;
export type LifecycleAvailabilityFacet =
	(typeof LIFECYCLE_AVAILABILITY_FACETS)[number];

export const OPERATIONALLY_SELECTABLE_LIFECYCLE_STATES = ["active"] as const;
export type OperationallySelectableLifecycleState =
	(typeof OPERATIONALLY_SELECTABLE_LIFECYCLE_STATES)[number];

export type LifecycleAvailabilityReason =
	| "not_found"
	| "not_active"
	| "blocked"
	| "retired"
	| "archived"
	| "merged"
	| "not_canonical";

export type LifecycleAvailabilityDecision = Readonly<{
	exists: boolean;
	historicallyResolvable: boolean;
	active: boolean;
	operationallySelectable: boolean;
	canonical: boolean;
	reasons: readonly LifecycleAvailabilityReason[];
}>;

export const LIFECYCLE_REASON_POLICIES = ["optional", "required"] as const;
export type LifecycleReasonPolicy = (typeof LIFECYCLE_REASON_POLICIES)[number];

export const LIFECYCLE_REASON_CODES = [
	"ordinary_deactivation",
	"reactivation",
	"governance_block",
	"governance_unblock",
	"quality_hold",
	"compliance_hold",
	"retirement",
	"archive",
	"restore",
	"revoke",
	"merge",
] as const;
export type LifecycleReasonCode = (typeof LIFECYCLE_REASON_CODES)[number];

export type LifecycleReason = Readonly<{
	code: LifecycleReasonCode;
	note?: string;
}>;

export const LIFECYCLE_CONTROLLED_FIELDS = [
	"status",
	"lifecycleState",
	"activatedAt",
	"activatedBy",
	"blockedAt",
	"blockedBy",
	"retiredAt",
	"retiredBy",
	"archivedAt",
	"archivedBy",
	"mergedIntoId",
	"mergedAt",
	"mergedBy",
	"mergeReasonCode",
] as const;
export type LifecycleControlledField =
	(typeof LIFECYCLE_CONTROLLED_FIELDS)[number];

export interface LifecycleTransitionDocumentation {
	requiredParentState: string | null;
	requiredChildEvidence: readonly string[];
	effectiveDateBehavior: string;
	canonicalIdentityBehavior: string;
	searchProjectionConsequence: string;
	permitsNewTransactionalUse: boolean;
}

export interface LifecycleTransitionDefinition<State extends string>
	extends LifecycleTransitionDocumentation {
	operation: string;
	from: readonly State[];
	to: State;
	requiredPermission: string;
	reasonPolicy: LifecycleReasonPolicy;
	expectedVersionRequired: boolean;
	dependencyPolicy?: string;
	eventType: string;
	reversible: boolean;
}

export type LifecyclePolicy<State extends string> = Readonly<{
	family: LifecycleFamily;
	entityType: string;
	transitions: Readonly<Record<string, LifecycleTransitionDefinition<State>>>;
}>;

export interface LifecycleDecision<State extends string> {
	from: State;
	to: State;
	operation: string;
	definition: LifecycleTransitionDefinition<State>;
}

export const LIFECYCLE_STATE_SOURCE = "authoritative_record" as const;
export type LifecycleStateSource = typeof LIFECYCLE_STATE_SOURCE;

export const DERIVED_LIFECYCLE_SIGNAL_SOURCES = [
	"timestamp",
	"dependency",
	"application_configuration",
	"search_projection",
	"ui_flag",
	"transactional_usage",
	"missing_value",
] as const;
export type DerivedLifecycleSignalSource =
	(typeof DERIVED_LIFECYCLE_SIGNAL_SOURCES)[number];

export type AuthoritativeLifecycleState<State extends string> = Readonly<{
	state: State;
	source: LifecycleStateSource;
}>;

export type LifecycleTransitionContext = Readonly<{
	entityType: string;
	entityId?: string;
	expectedVersion?: number;
	actualVersion?: number;
}>;

export type VersionedLifecycleRecord = Readonly<{
	id: string;
	version: number;
}>;
