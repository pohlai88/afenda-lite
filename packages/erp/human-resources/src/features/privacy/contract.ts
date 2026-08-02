import type { Result } from "@afenda/errors";
import type { HumanResourcesSensitiveResourceType } from "../../kernel/authorization/contextual-authorization";
import type { HumanResourcesEmployeeId } from "../../kernel/identity/brands";

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

export interface HumanResourcesRetentionPolicy {
	anonymizationMode:
		| "delete_identifiers"
		| "pseudonymize"
		| "retain_legal_record";
	classification: HumanResourcesRetentionClassification;
	legalHoldEligible: boolean;
	minimumRetentionMonths: number;
}

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

export interface HumanResourcesPrivacyRequestContext {
	actorUserId: string;
	correlationId: string;
	legalBasis: string;
	organizationId: string;
	requestedAt: string;
	subjectEmployeeId: HumanResourcesEmployeeId;
}

export interface HumanResourcesPrivacySubjectRecord {
	entity: string;
	organizationId: string;
	recordId: string;
}

export interface HumanResourcesPrivacyExportResult {
	exportReference: string;
	recordCount: number;
	records: readonly HumanResourcesPrivacySubjectRecord[];
}

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

export interface HumanResourcesSubjectExportRecord {
	category: HumanResourcesSubjectExportRecordCategory;
	classification: "personal" | "sensitive" | "highly_sensitive";
	data: Readonly<Record<string, unknown>>;
	entityId: string;
	entityType: string;
	retentionClass: string;
}

export interface HumanResourcesSubjectExportBundle {
	correlationId: string;
	exportReference: string;
	generatedAt: string;
	organizationId: string;
	recordCount: number;
	records: readonly HumanResourcesSubjectExportRecord[];
	schemaVersion: typeof HUMAN_RESOURCES_SUBJECT_EXPORT_SCHEMA_VERSION;
	subject: {
		personId: string;
		employeeIds: readonly string[];
		workerIds: readonly string[];
	};
}

export interface HumanResourcesPrivacyCase {
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
	subjectEmployeeId: HumanResourcesEmployeeId;
}

export interface HumanResourcesAnonymizationEvaluation {
	allowed: boolean;
	reasonCode?: string;
}

export interface HumanResourcesRetentionEvaluation {
	policies: readonly HumanResourcesRetentionPolicy[];
}

export interface HumanResourcesPrivacyPort {
	anonymizeSubject: (
		input: HumanResourcesPrivacyRequestContext & {
			classifications: readonly HumanResourcesRetentionClassification[];
		},
	) => Promise<Result<{ anonymizedRecordCount: number }>>;
	evaluateAnonymization: (
		input: HumanResourcesPrivacyRequestContext & {
			classifications?: readonly HumanResourcesRetentionClassification[];
		},
	) => Promise<Result<HumanResourcesAnonymizationEvaluation>>;
	exportSubject: (
		input: HumanResourcesPrivacyRequestContext,
	) => Promise<Result<HumanResourcesPrivacyExportResult>>;
	getSubjectPrivacyCase: (
		input: HumanResourcesPrivacyRequestContext,
	) => Promise<Result<HumanResourcesPrivacyCase>>;
	placeLegalHold: (
		input: HumanResourcesPrivacyRequestContext & {
			holdReference: string;
			classifications: readonly HumanResourcesRetentionClassification[];
		},
	) => Promise<Result<{ legalHoldId: string }>>;
	rectifySubject: (
		input: HumanResourcesPrivacyRequestContext & {
			changes: Readonly<Record<string, unknown>>;
		},
	) => Promise<Result<{ rectifiedRecordCount: number }>>;
	redactDownstream: (input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		subjectEmployeeId: HumanResourcesEmployeeId;
		resourceTypes: readonly HumanResourcesSensitiveResourceType[];
		requestedAt: string;
	}) => Promise<Result<{ redactedSystemCount: number }>>;
	releaseLegalHold: (input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		legalHoldId: string;
		reason: string;
		releasedAt: string;
	}) => Promise<Result<void>>;
}
