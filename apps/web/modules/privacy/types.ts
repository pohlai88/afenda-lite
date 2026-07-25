import type { Result } from "@afenda/errors/result";

export type PrivacyModuleId = "human-resources" | (string & {});

export type PrivacySubjectRecord = {
	recordId: string;
	entity: string;
	organizationId: string;
};

export type PrivacySubjectInventoryPort = {
	listSubjectRecords(input: {
		moduleId: PrivacyModuleId;
		organizationId: string;
		subjectId: string;
	}): Promise<Result<readonly PrivacySubjectRecord[]>>;
};

export type PrivacySubjectRequestContext = {
	moduleId: PrivacyModuleId;
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	subjectId: string;
	requestedAt: string;
	legalBasis: string;
};

export type PrivacyExportResult = {
	exportReference: string;
	recordCount: number;
	records: readonly PrivacySubjectRecord[];
};

export type PrivacySubjectCase = {
	organizationId: string;
	subjectId: string;
	exports: readonly {
		exportId: string;
		exportReference: string;
		recordCount: number;
		createdAt: string;
	}[];
	activeLegalHolds: readonly {
		legalHoldId: string;
		holdReference: string;
		classifications: readonly string[];
		placedAt: string;
	}[];
	recentOperations: readonly {
		operationId: string;
		kind: string;
		affectedCount: number;
		createdAt: string;
	}[];
};

export type PrivacyAnonymizationEvaluation = {
	allowed: boolean;
	reasonCode?: string;
};

export type PrivacyRectifyResult = {
	rectifiedRecordCount: number;
};

export type PrivacyAnonymizeResult = {
	anonymizedRecordCount: number;
};

export type PrivacyLegalHoldResult = {
	legalHoldId: string;
};

export type PrivacyRedactDownstreamResult = {
	redactedSystemCount: number;
};

export type PrivacyAuditPort = {
	record(
		input: unknown,
	): Promise<Result<{ id: string; organizationId: string }>>;
};

export type PlatformPrivacyService = {
	exportSubject(
		input: PrivacySubjectRequestContext,
	): Promise<Result<PrivacyExportResult>>;
	getSubjectPrivacyCase(
		input: PrivacySubjectRequestContext,
	): Promise<Result<PrivacySubjectCase>>;
	rectifySubject(
		input: PrivacySubjectRequestContext & {
			changes: Readonly<Record<string, unknown>>;
		},
	): Promise<Result<PrivacyRectifyResult>>;
	anonymizeSubject(
		input: PrivacySubjectRequestContext & {
			classifications: readonly string[];
		},
	): Promise<Result<PrivacyAnonymizeResult>>;
	evaluateAnonymization(
		input: PrivacySubjectRequestContext & {
			classifications?: readonly string[];
		},
	): Promise<Result<PrivacyAnonymizationEvaluation>>;
	placeLegalHold(
		input: PrivacySubjectRequestContext & {
			holdReference: string;
			classifications: readonly string[];
		},
	): Promise<Result<PrivacyLegalHoldResult>>;
	releaseLegalHold(input: {
		moduleId: PrivacyModuleId;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		legalHoldId: string;
		reason: string;
		releasedAt: string;
	}): Promise<Result<void>>;
	redactDownstream(input: {
		moduleId: PrivacyModuleId;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		subjectId: string;
		resourceTypes: readonly string[];
		requestedAt: string;
	}): Promise<Result<PrivacyRedactDownstreamResult>>;
};
