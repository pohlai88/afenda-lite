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

export type HumanResourcesPrivacyPort = {
	exportSubject(
		input: HumanResourcesPrivacyRequestContext,
	): Promise<Result<{ exportReference: string; recordCount: number }>>;
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
