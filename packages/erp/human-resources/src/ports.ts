import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { HumanResourcesEventType } from "@afenda/events";

export type AuditFactInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	entity: string;
	entityId: string;
	action: "CREATE" | "UPDATE" | "DELETE";
	changes: Change[];
	oldValue?: Record<string, unknown> | null;
	newValue?: Record<string, unknown> | null;
};

export type AuditFactPort = {
	record(input: AuditFactInput): Promise<Result<{ id: string }>>;
};

export type OutboxFactInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	type: HumanResourcesEventType;
	payload: Record<string, unknown>;
};

export type OutboxPort = {
	append(input: OutboxFactInput): Promise<Result<{ id: string }>>;
};

export type MutationPorts = {
	audit: AuditFactPort;
	outbox: OutboxPort;
};

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

export type ValidatedDocumentReference = {
	/** Normalized canonical vault URI. */
	reference: string;
	organizationId: string;
	documentKind: DocumentKind;
	documentId: string;
	version: string | null;
};

export type DocumentReferencePort = {
	validateReference(input: {
		organizationId: string;
		reference: string;
		allowedKinds?: readonly DocumentKind[];
		requireImmutableVersion?: boolean;
	}): Promise<Result<ValidatedDocumentReference>>;
};

/**
 * Platform-owned object-policy hook. HR stores only canonical immutable
 * references; binary storage, scanning, ACL, retention, and signature state
 * remain outside the HR package.
 */
export type DocumentObjectResolverPort = {
	assertObjectAcceptable(input: {
		organizationId: string;
		reference: string;
		validated: ValidatedDocumentReference;
	}): Promise<Result<void>>;
};

export type CurrencyLookupPort = {
	exists(currencyCode: string): Promise<Result<boolean>>;
};

export const HUMAN_RESOURCES_ORGANIZATION_DIMENSION_KINDS = [
	"legal_entity",
	"business_unit",
	"location",
	"cost_centre",
	"project",
] as const;

export type HumanResourcesOrganizationDimensionKind =
	(typeof HUMAN_RESOURCES_ORGANIZATION_DIMENSION_KINDS)[number];

export type HumanResourcesOrganizationDimensionSnapshot = {
	id: string;
	kind: HumanResourcesOrganizationDimensionKind;
	key: string;
	name: string;
};

export type HumanResourcesOrganizationDimensions = Record<
	HumanResourcesOrganizationDimensionKind,
	HumanResourcesOrganizationDimensionSnapshot
>;

/**
 * App-composed read boundary to governed `@afenda/master-data` dimensions.
 * Implementations must scope every lookup by organization and effective date.
 */
export type OrganizationDimensionDirectoryPort = {
	resolveRequiredAsOf(input: {
		organizationId: string;
		actorUserId: string;
		asOf: string;
		keys: Record<HumanResourcesOrganizationDimensionKind, string>;
	}): Promise<Result<HumanResourcesOrganizationDimensions>>;
};

export type {
	ApprovedLeaveFact,
	ApprovedLeaveQueryPort,
	AttendanceSourceBatch,
	AttendanceSourceEvent,
	AttendanceSourcePort,
} from "./time/handoff/ports";
export type { WorkCalendarPort } from "./time/work-calendar";
