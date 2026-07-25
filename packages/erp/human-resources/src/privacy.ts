import type { Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "./brands";
import type { HumanResourcesSensitiveResourceType } from "./shared/contextual-authorization";

export const HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS = [
	"workforce_core",
	"pay_and_benefits",
	"medical_and_leave",
	"recruitment_and_background",
	"employee_relations_and_legal",
	"performance_and_talent",
] as const;

export type HumanResourcesRetentionClassification =
	(typeof HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS)[number];

export type HumanResourcesRetentionPolicy = {
	classification: HumanResourcesRetentionClassification;
	minimumRetentionMonths: number;
	legalHoldEligible: boolean;
	anonymizationMode:
		| "delete_identifiers"
		| "pseudonymize"
		| "retain_legal_record";
};

export const HUMAN_RESOURCES_RETENTION_POLICIES = {
	workforce_core: {
		classification: "workforce_core",
		minimumRetentionMonths: 84,
		legalHoldEligible: true,
		anonymizationMode: "pseudonymize",
	},
	pay_and_benefits: {
		classification: "pay_and_benefits",
		minimumRetentionMonths: 84,
		legalHoldEligible: true,
		anonymizationMode: "retain_legal_record",
	},
	medical_and_leave: {
		classification: "medical_and_leave",
		minimumRetentionMonths: 72,
		legalHoldEligible: true,
		anonymizationMode: "pseudonymize",
	},
	recruitment_and_background: {
		classification: "recruitment_and_background",
		minimumRetentionMonths: 24,
		legalHoldEligible: true,
		anonymizationMode: "delete_identifiers",
	},
	employee_relations_and_legal: {
		classification: "employee_relations_and_legal",
		minimumRetentionMonths: 120,
		legalHoldEligible: true,
		anonymizationMode: "retain_legal_record",
	},
	performance_and_talent: {
		classification: "performance_and_talent",
		minimumRetentionMonths: 60,
		legalHoldEligible: true,
		anonymizationMode: "pseudonymize",
	},
} as const satisfies Record<
	HumanResourcesRetentionClassification,
	HumanResourcesRetentionPolicy
>;

export type HumanResourcesPrivacyRequestContext = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	subjectEmployeeId: HumanResourcesEmployeeId;
	requestedAt: string;
	legalBasis: string;
};

export type HumanResourcesPrivacySubjectRecord = {
	recordId: string;
	entity: string;
	organizationId: string;
};

export type HumanResourcesPrivacyExportResult = {
	exportReference: string;
	recordCount: number;
	records: readonly HumanResourcesPrivacySubjectRecord[];
};

export const HUMAN_RESOURCES_SUBJECT_EXPORT_SCHEMA_VERSION =
	"human-resources.subject-export.v1" as const;

export type HumanResourcesSubjectExportRecordCategory =
	| "identity"
	| "employment"
	| "assignment"
	| "recruitment"
	| "leave"
	| "time"
	| "compensation"
	| "performance"
	| "learning"
	| "talent"
	| "compliance"
	| "employee_relations";

export type HumanResourcesSubjectExportRecord = {
	category: HumanResourcesSubjectExportRecordCategory;
	entityType: string;
	entityId: string;
	classification: "personal" | "sensitive" | "highly_sensitive";
	retentionClass: string;
	data: Readonly<Record<string, unknown>>;
};

export type HumanResourcesSubjectExportBundle = {
	schemaVersion: typeof HUMAN_RESOURCES_SUBJECT_EXPORT_SCHEMA_VERSION;
	organizationId: string;
	generatedAt: string;
	correlationId: string;
	exportReference: string;
	recordCount: number;
	subject: {
		personId: string;
		employeeIds: readonly string[];
		workerIds: readonly string[];
	};
	records: readonly HumanResourcesSubjectExportRecord[];
};

export type HumanResourcesPrivacyCase = {
	organizationId: string;
	subjectEmployeeId: HumanResourcesEmployeeId;
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

export type HumanResourcesAnonymizationEvaluation = {
	allowed: boolean;
	reasonCode?: string;
};

export type HumanResourcesRetentionEvaluation = {
	policies: readonly HumanResourcesRetentionPolicy[];
};

export type HumanResourcesPrivacyPort = {
	exportSubject(
		input: HumanResourcesPrivacyRequestContext,
	): Promise<Result<HumanResourcesPrivacyExportResult>>;
	getSubjectPrivacyCase(
		input: HumanResourcesPrivacyRequestContext,
	): Promise<Result<HumanResourcesPrivacyCase>>;
	evaluateAnonymization(
		input: HumanResourcesPrivacyRequestContext & {
			classifications?: readonly HumanResourcesRetentionClassification[];
		},
	): Promise<Result<HumanResourcesAnonymizationEvaluation>>;
	rectifySubject(
		input: HumanResourcesPrivacyRequestContext & {
			changes: Readonly<Record<string, unknown>>;
		},
	): Promise<Result<{ rectifiedRecordCount: number }>>;
	anonymizeSubject(
		input: HumanResourcesPrivacyRequestContext & {
			classifications: readonly HumanResourcesRetentionClassification[];
		},
	): Promise<Result<{ anonymizedRecordCount: number }>>;
	placeLegalHold(
		input: HumanResourcesPrivacyRequestContext & {
			holdReference: string;
			classifications: readonly HumanResourcesRetentionClassification[];
		},
	): Promise<Result<{ legalHoldId: string }>>;
	releaseLegalHold(input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		legalHoldId: string;
		reason: string;
		releasedAt: string;
	}): Promise<Result<void>>;
	redactDownstream(input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		subjectEmployeeId: HumanResourcesEmployeeId;
		resourceTypes: readonly HumanResourcesSensitiveResourceType[];
		requestedAt: string;
	}): Promise<Result<{ redactedSystemCount: number }>>;
};
