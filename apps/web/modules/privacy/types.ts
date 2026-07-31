import type { Result } from "@afenda/errors";

export type PrivacyModuleId = "human-resources" | (string & {});

export interface PrivacySubjectRecord {
	entity: string;
	organizationId: string;
	recordId: string;
}

export interface PrivacySubjectInventoryPort {
	listSubjectRecords: (input: {
		moduleId: PrivacyModuleId;
		organizationId: string;
		subjectId: string;
	}) => Promise<Result<readonly PrivacySubjectRecord[]>>;
}

export interface PrivacySubjectRequestContext {
	actorUserId: string;
	correlationId: string;
	legalBasis: string;
	moduleId: PrivacyModuleId;
	organizationId: string;
	requestedAt: string;
	subjectId: string;
}

export interface PrivacyExportResult {
	exportReference: string;
	recordCount: number;
	records: readonly PrivacySubjectRecord[];
}

export interface PrivacySubjectCase {
	activeLegalHolds: readonly {
		legalHoldId: string;
		holdReference: string;
		classifications: readonly string[];
		placedAt: string;
	}[];
	exports: readonly {
		exportId: string;
		exportReference: string;
		recordCount: number;
		createdAt: string;
	}[];
	organizationId: string;
	recentOperations: readonly {
		operationId: string;
		kind: string;
		affectedCount: number;
		createdAt: string;
	}[];
	subjectId: string;
}

export interface PrivacyAnonymizationEvaluation {
	allowed: boolean;
	reasonCode?: string;
}

export interface PrivacyRectifyResult {
	rectifiedRecordCount: number;
}

export interface PrivacyAnonymizeResult {
	anonymizedRecordCount: number;
}

export interface PrivacyLegalHoldResult {
	legalHoldId: string;
}

export interface PrivacyRedactDownstreamResult {
	redactedSystemCount: number;
}

export interface PrivacyAuditPort {
	record: (
		input: unknown,
	) => Promise<Result<{ id: string; organizationId: string }>>;
}

export interface PlatformPrivacyService {
	anonymizeSubject: (
		input: PrivacySubjectRequestContext & {
			classifications: readonly string[];
		},
	) => Promise<Result<PrivacyAnonymizeResult>>;
	evaluateAnonymization: (
		input: PrivacySubjectRequestContext & {
			classifications?: readonly string[];
		},
	) => Promise<Result<PrivacyAnonymizationEvaluation>>;
	exportSubject: (
		input: PrivacySubjectRequestContext,
	) => Promise<Result<PrivacyExportResult>>;
	getSubjectPrivacyCase: (
		input: PrivacySubjectRequestContext,
	) => Promise<Result<PrivacySubjectCase>>;
	placeLegalHold: (
		input: PrivacySubjectRequestContext & {
			holdReference: string;
			classifications: readonly string[];
		},
	) => Promise<Result<PrivacyLegalHoldResult>>;
	rectifySubject: (
		input: PrivacySubjectRequestContext & {
			changes: Readonly<Record<string, unknown>>;
		},
	) => Promise<Result<PrivacyRectifyResult>>;
	redactDownstream: (input: {
		moduleId: PrivacyModuleId;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		subjectId: string;
		resourceTypes: readonly string[];
		requestedAt: string;
	}) => Promise<Result<PrivacyRedactDownstreamResult>>;
	releaseLegalHold: (input: {
		moduleId: PrivacyModuleId;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		legalHoldId: string;
		reason: string;
		releasedAt: string;
	}) => Promise<Result<void>>;
}
