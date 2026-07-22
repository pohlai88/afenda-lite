import type { Result } from "@afenda/errors/result";
import type {
	HumanResourcesDocumentRequirementId,
	HumanResourcesEmployeeDocumentId,
	HumanResourcesEmployeeId,
	HumanResourcesPolicyAcknowledgementId,
	HumanResourcesWorkEligibilityId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type { EmployeeDocumentVerificationStatus } from "../shared/compliance-status";
import type {
	DocumentRequirement,
	DocumentRequirementListPage,
	EmployeeComplianceSummary,
	EmployeeDocument,
	EmployeeDocumentListPage,
	IdempotentEmployeeDocumentRecord,
	IdempotentPolicyAcknowledgementRecord,
	IdempotentWorkEligibilityRecord,
	PolicyAcknowledgement,
	PolicyAcknowledgementListPage,
	WorkEligibility,
	WorkEligibilityRiskListPage,
} from "../types";

/**
 * Persistence contract for Employee compliance.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export type HumanResourcesComplianceStore = {
	// Document Requirement
	getDocumentRequirementById(input: {
		organizationId: string;
		requirementId: HumanResourcesDocumentRequirementId;
	}): Promise<Result<DocumentRequirement | null>>;

	findDocumentRequirementByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<DocumentRequirement | null>>;

	createDocumentRequirement(
		record: {
			organizationId: string;
			code: string;
			name: string;
			documentType: string;
			issuingJurisdiction: string | null;
			appliesToNote: string | null;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<DocumentRequirement>>;

	updateDocumentRequirement(
		input: {
			organizationId: string;
			requirementId: HumanResourcesDocumentRequirementId;
			name?: string;
			documentType?: string;
			issuingJurisdiction?: string | null;
			appliesToNote?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<DocumentRequirement>>;

	publishDocumentRequirement(
		input: {
			organizationId: string;
			requirementId: HumanResourcesDocumentRequirementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<DocumentRequirement>>;

	retireDocumentRequirement(
		input: {
			organizationId: string;
			requirementId: HumanResourcesDocumentRequirementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<DocumentRequirement>>;

	listPublishedDocumentRequirements(input: {
		organizationId: string;
		page: number;
		pageSize: number;
	}): Promise<Result<DocumentRequirementListPage>>;
	// Employee Document
	getEmployeeDocumentById(input: {
		organizationId: string;
		documentId: HumanResourcesEmployeeDocumentId;
	}): Promise<Result<EmployeeDocument | null>>;

	findEmployeeDocumentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmployeeDocumentRecord | null>>;

	registerEmployeeDocument(
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			requirementId: HumanResourcesDocumentRequirementId | null;
			documentType: string;
			issuingJurisdiction: string | null;
			issuedOn: string;
			expiresOn: string | null;
			documentRef: string;
			identifierLast4: string | null;
			identifierFingerprint: string | null;
			metadata: Record<string, unknown> | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	updateEmployeeDocumentMetadata(
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			issuingJurisdiction?: string | null;
			expiresOn?: string | null;
			metadata?: Record<string, unknown> | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	verifyEmployeeDocument(
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			evidenceDate: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	rejectEmployeeDocument(
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			rejectionReason: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	revokeEmployeeDocumentVerification(
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	markEmployeeDocumentExpired(
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	listEmployeeDocuments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		verificationStatus?: EmployeeDocumentVerificationStatus;
	}): Promise<Result<EmployeeDocumentListPage>>;

	listMissingRequiredDocuments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
	}): Promise<Result<DocumentRequirementListPage>>;

	listExpiringEmployeeDocuments(input: {
		organizationId: string;
		asOf: string;
		withinDays: number;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
	}): Promise<Result<EmployeeDocumentListPage>>;
	// Work Eligibility
	getWorkEligibilityById(input: {
		organizationId: string;
		eligibilityId: HumanResourcesWorkEligibilityId;
	}): Promise<Result<WorkEligibility | null>>;

	getActiveWorkEligibilityForEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<WorkEligibility | null>>;

	findWorkEligibilityByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentWorkEligibilityRecord | null>>;

	recordWorkEligibility(
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			countryCode: string;
			jurisdiction: string | null;
			issuedOn: string;
			expiresOn: string | null;
			documentRef: string | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkEligibility>>;

	verifyWorkEligibility(
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			evidenceDate: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkEligibility>>;

	suspendWorkEligibility(
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkEligibility>>;

	renewWorkEligibility(
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			issuedOn: string;
			expiresOn: string | null;
			documentRef: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkEligibility>>;

	closeWorkEligibility(
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkEligibility>>;

	listEmployeesWithWorkEligibilityRisk(input: {
		organizationId: string;
		asOf: string;
		page: number;
		pageSize: number;
	}): Promise<Result<WorkEligibilityRiskListPage>>;
	// Policy Acknowledgement
	getPolicyAcknowledgementById(input: {
		organizationId: string;
		acknowledgementId: HumanResourcesPolicyAcknowledgementId;
	}): Promise<Result<PolicyAcknowledgement | null>>;

	findPolicyAcknowledgementByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPolicyAcknowledgementRecord | null>>;

	issuePolicyAcknowledgementRequirement(
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			policyCode: string;
			policyVersion: string;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PolicyAcknowledgement>>;

	acknowledgePolicy(
		input: {
			organizationId: string;
			acknowledgementId: HumanResourcesPolicyAcknowledgementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PolicyAcknowledgement>>;

	revokePolicyAcknowledgement(
		input: {
			organizationId: string;
			acknowledgementId: HumanResourcesPolicyAcknowledgementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PolicyAcknowledgement>>;

	supersedePolicyAcknowledgementRequirement(
		input: {
			organizationId: string;
			acknowledgementId: HumanResourcesPolicyAcknowledgementId;
			newPolicyVersion: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PolicyAcknowledgement>>;

	getPolicyAcknowledgementStatus(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		policyCode: string;
		policyVersion?: string;
	}): Promise<Result<PolicyAcknowledgement | null>>;

	listOutstandingPolicyAcknowledgements(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
	}): Promise<Result<PolicyAcknowledgementListPage>>;

	getEmployeeComplianceSummary(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf?: string;
	}): Promise<Result<EmployeeComplianceSummary>>;
};
