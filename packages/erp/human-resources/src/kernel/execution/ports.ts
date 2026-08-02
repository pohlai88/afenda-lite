import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors";
import type { HumanResourcesEventType } from "@afenda/events";

export interface AuditFactInput {
	action: "CREATE" | "UPDATE" | "DELETE";
	actorUserId: string;
	changes: Change[];
	correlationId: string;
	entity: string;
	entityId: string;
	newValue?: Record<string, unknown> | null | undefined;
	oldValue?: Record<string, unknown> | null | undefined;
	organizationId: string;
}

export interface AuditFactPort {
	record: (input: AuditFactInput) => Promise<Result<{ id: string }>>;
}

export interface OutboxFactInput {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
	payload: Record<string, unknown>;
	type: HumanResourcesEventType;
}

export interface OutboxPort {
	append: (input: OutboxFactInput) => Promise<Result<{ id: string }>>;
}

export interface MutationPorts {
	audit: AuditFactPort;
	outbox: OutboxPort;
}

export const HUMAN_RESOURCES_DOCUMENT_KINDS = [
	"passport",
	"work_authorization",
	"identity_document",
	"employment_contract",
	"employee_document",
	"case_evidence",
	"policy_document",
	"certification",
	"other",
] as const;

export type DocumentKind = (typeof HUMAN_RESOURCES_DOCUMENT_KINDS)[number];

export interface ValidatedDocumentReference {
	documentId: string;
	documentKind: DocumentKind;
	organizationId: string;
	/** Normalized canonical vault URI. */
	reference: string;
	version: string | null;
}

export interface DocumentReferencePort {
	validateReference: (input: {
		organizationId: string;
		reference: string;
		allowedKinds?: readonly DocumentKind[];
		requireImmutableVersion?: boolean;
	}) => Promise<Result<ValidatedDocumentReference>>;
}

/**
 * Platform-owned object-policy hook. HR stores only canonical immutable
 * references; binary storage, scanning, ACL, retention, and signature state
 * remain outside the HR package.
 */
export interface DocumentObjectResolverPort {
	assertObjectAcceptable: (input: {
		organizationId: string;
		reference: string;
		validated: ValidatedDocumentReference;
	}) => Promise<Result<void>>;
}

export interface CurrencyLookupPort {
	exists: (input: {
		actorUserId: string;
		currencyCode: string;
		organizationId: string;
	}) => Promise<Result<boolean>>;
}

export const HUMAN_RESOURCES_ORGANIZATION_DIMENSION_KINDS = [
	"legal_entity",
	"business_unit",
	"location",
	"cost_centre",
	"project",
] as const;

export type HumanResourcesOrganizationDimensionKind =
	(typeof HUMAN_RESOURCES_ORGANIZATION_DIMENSION_KINDS)[number];

export interface HumanResourcesOrganizationDimensionSnapshot {
	id: string;
	key: string;
	kind: HumanResourcesOrganizationDimensionKind;
	name: string;
}

export type HumanResourcesOrganizationDimensions = Record<
	HumanResourcesOrganizationDimensionKind,
	HumanResourcesOrganizationDimensionSnapshot
>;

/**
 * App-composed read boundary to governed `@afenda/master-data` dimensions.
 * Implementations must scope every lookup by organization and effective date.
 */
export interface OrganizationDimensionDirectoryPort {
	resolveRequiredAsOf: (input: {
		organizationId: string;
		actorUserId: string;
		asOf: string;
		keys: Record<HumanResourcesOrganizationDimensionKind, string>;
	}) => Promise<Result<HumanResourcesOrganizationDimensions>>;
}

export type {
	ApprovedLeaveFact,
	ApprovedLeaveQueryPort,
	AttendanceConnectorPullPort,
	AttendanceSourceBatch,
	AttendanceSourceEvent,
	AttendanceSourcePort,
	AttendanceSourcePreviewResult,
	AttendanceSourceRejectedRow,
} from "../../features/time/handoff/ports";
export type { WorkCalendarPort } from "../../features/time/work-calendar";
