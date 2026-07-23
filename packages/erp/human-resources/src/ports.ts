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
 * Optional existence / policy resolver injected at composition root when a
 * document platform exists. Without it, DocumentReferencePort validates
 * reference shape only.
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

export type {
	ApprovedLeaveFact,
	ApprovedLeaveQueryPort,
	AttendanceSourceBatch,
	AttendanceSourceEvent,
	AttendanceSourcePort,
} from "./time/handoff/ports";
export type { WorkCalendarPort } from "./work-calendar";
