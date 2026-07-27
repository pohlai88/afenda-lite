import type { GovernancePermission } from "./permissions";

export const GOVERNED_MASTER_ENTITY_TYPES = [
	"party",
	"item",
	"item_group",
	"item_template",
	"item_variant",
	"warehouse",
	"payment_term",
	"tax_registration",
] as const;
export type GovernedMasterEntityType =
	(typeof GOVERNED_MASTER_ENTITY_TYPES)[number];

export const GOVERNANCE_RESOURCE_TYPES = [
	"change_request",
	"import_batch",
	"merge_request",
] as const;
export type GovernanceResourceType = (typeof GOVERNANCE_RESOURCE_TYPES)[number];

export const CHANGE_REQUEST_TYPES = [
	"master_create",
	"master_update",
	"master_lifecycle",
	"party_relationship",
	"merge_authorization",
	"import_authorization",
] as const;
export type ChangeRequestType = (typeof CHANGE_REQUEST_TYPES)[number];

export const CHANGE_REQUEST_CANONICAL_FIELDS = [
	"targetEntityType",
	"targetEntityId",
	"operationType",
	"beforeSnapshot",
	"proposedPatch",
	"reason",
	"requestedBy",
	"reviewedBy",
	"approvalStatus",
	"expectedTargetVersion",
	"decidedAt",
	"appliedAt",
] as const;
export type ChangeRequestCanonicalField =
	(typeof CHANGE_REQUEST_CANONICAL_FIELDS)[number];

export const CHANGE_REQUEST_CONTROLLED_SCOPE = [
	"activation",
	"merge",
	"sensitive_field_change",
	"tax_identity_change",
	"external_identifier_change",
	"duplicate_resolution_merge",
] as const;
export type ChangeRequestControlledScope =
	(typeof CHANGE_REQUEST_CONTROLLED_SCOPE)[number];

export const CHANGE_REQUEST_SEPARATE_GOVERNANCE_SCOPE = [
	"import_batch",
	"bulk_import_apply",
	"duplicate_warning_review",
	"mass_update_batch",
] as const;
export type ChangeRequestSeparateGovernanceScope =
	(typeof CHANGE_REQUEST_SEPARATE_GOVERNANCE_SCOPE)[number];

export const CHANGE_REQUEST_PROHIBITED_SCOPE = [
	"generic_workflow_engine",
	"arbitrary_json_patch",
	"cross_module_transaction_workflow",
	"platform_reference_mutation",
	"ui_state_approval",
] as const;
export type ChangeRequestProhibitedScope =
	(typeof CHANGE_REQUEST_PROHIBITED_SCOPE)[number];

export const CHANGE_REQUEST_SCOPE_CONTRACT = {
	currentPublicCommandKinds: ["activate_party", "merge_parties"],
	canonicalFields: CHANGE_REQUEST_CANONICAL_FIELDS,
	controlledScope: CHANGE_REQUEST_CONTROLLED_SCOPE,
	separateGovernanceScope: CHANGE_REQUEST_SEPARATE_GOVERNANCE_SCOPE,
	prohibitedScope: CHANGE_REQUEST_PROHIBITED_SCOPE,
} as const;

export const CHANGE_REQUEST_OPERATIONS = [
	"create",
	"update",
	"activate",
	"deactivate",
	"block",
	"unblock",
	"retire",
	"restore",
	"archive",
	"relationship_change",
	"sensitive_identifier_change",
	"merge",
	"import_apply",
] as const;
export type ChangeRequestOperation = (typeof CHANGE_REQUEST_OPERATIONS)[number];

export const CHANGE_REQUEST_STATUSES = [
	"draft",
	"submitted",
	"approved",
	"applying",
	"applied",
	"failed",
	"rejected",
	"cancelled",
	"expired",
	"superseded",
] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export const CHANGE_REQUEST_TERMINAL_STATUSES = [
	"applied",
	"failed",
	"rejected",
	"cancelled",
	"expired",
	"superseded",
] as const satisfies readonly ChangeRequestStatus[];

export type GovernanceJsonPrimitive = string | number | boolean | null;

export type GovernanceJsonValue =
	| GovernanceJsonPrimitive
	| GovernanceJsonObject
	| readonly GovernanceJsonValue[];

export type GovernanceJsonObject = Readonly<{
	[key: string]: GovernanceJsonValue;
}>;

export const CHANGE_REQUEST_ACTOR_FIELDS = [
	"requestedBy",
	"submittedBy",
	"reviewedBy",
	"approvedBy",
	"rejectedBy",
	"appliedBy",
	"cancelledBy",
] as const;

export type ChangeRequestActorField =
	(typeof CHANGE_REQUEST_ACTOR_FIELDS)[number];

export type ActorSegregationRule = Readonly<{
	left: ChangeRequestActorField;
	right: ChangeRequestActorField;
	operation: string;
}>;

export type ChangeRequestRecord = Readonly<{
	id: string;
	organizationId: string;
	requestType: ChangeRequestType;
	targetEntityType: GovernedMasterEntityType;
	targetEntityId: string | null;
	targetExpectedVersion: number | null;
	sourceResourceType: GovernanceResourceType | null;
	sourceResourceId: string | null;
	requestedOperation: ChangeRequestOperation;
	proposalVersion: number;
	workflowVersion: number;
	normalizedPayload: GovernanceJsonObject;
	beforeSnapshot: GovernanceJsonObject | null;
	mutableFieldAllowlistId: string;
	mutableFieldAllowlistVersion: number;
	reasonCode: string;
	reasonNote: string | null;
	status: ChangeRequestStatus;
	requestedBy: string;
	submittedBy: string | null;
	submittedAt: Date | null;
	reviewedBy: string | null;
	reviewedAt: Date | null;
	approvedBy: string | null;
	approvedAt: Date | null;
	rejectedBy: string | null;
	rejectedAt: Date | null;
	decisionReason: string | null;
	cancelledBy: string | null;
	cancelledAt: Date | null;
	applyStartedAt: Date | null;
	appliedBy: string | null;
	appliedAt: Date | null;
	failedAt: Date | null;
	resultEntityId: string | null;
	resultEntityVersion: number | null;
	failureCode: string | null;
	failureDetails: GovernanceJsonObject | null;
	expiresAt: Date | null;
	expiredAt: Date | null;
	supersedesRequestId: string | null;
	supersededAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}>;

export const CHANGE_REQUEST_TRANSITION_AUTHORITIES = [
	"actor",
	"system",
	"apply_orchestrator",
] as const;

export type ChangeRequestTransitionAuthority =
	(typeof CHANGE_REQUEST_TRANSITION_AUTHORITIES)[number];

type ActorTransitionAuthority = Readonly<{
	authority: "actor";
	requiredPermission: GovernancePermission;
}>;

type InternalTransitionAuthority = Readonly<{
	authority: "system" | "apply_orchestrator";
	requiredPermission: null;
}>;

export type ChangeRequestTransitionDefinition = Readonly<{
	operation: string;
	from: readonly ChangeRequestStatus[];
	to: ChangeRequestStatus;
	reasonRequired: boolean;
	expectedWorkflowVersionRequired: boolean;
	eventType: string;
	auditAction: string;
	reversible: boolean;
}> &
	(ActorTransitionAuthority | InternalTransitionAuthority);
