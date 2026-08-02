import type { Result } from "@afenda/errors";
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
} from "../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	HumanResourcesDocumentRequirementId,
	HumanResourcesEmployeeDocumentId,
	HumanResourcesEmployeeId,
	HumanResourcesPolicyAcknowledgementId,
	HumanResourcesWorkEligibilityId,
} from "../../kernel/identity/brands";
import type {
	DocumentRequirementApplicability,
	EmployeeDocumentVerificationStatus,
} from "./status";

/**
 * Persistence contract for Employee compliance.
 *
 * This feature owns its narrow persistence contract. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export interface HumanResourcesComplianceStore {
	acknowledgePolicy: (
		input: {
			organizationId: string;
			acknowledgementId: HumanResourcesPolicyAcknowledgementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PolicyAcknowledgement>>;

	closeWorkEligibility: (
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<WorkEligibility>>;

	createDocumentRequirement: (
		record: {
			organizationId: string;
			code: string;
			name: string;
			documentType: string;
			issuingJurisdiction: string | null;
			appliesToNote: string | null;
			applicability: DocumentRequirementApplicability;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<DocumentRequirement>>;

	findDocumentRequirementByCode: (input: {
		organizationId: string;
		code: string;
	}) => Promise<Result<DocumentRequirement | null>>;

	findEmployeeDocumentByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentEmployeeDocumentRecord | null>>;

	findPolicyAcknowledgementByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentPolicyAcknowledgementRecord | null>>;

	findWorkEligibilityByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentWorkEligibilityRecord | null>>;

	getActiveWorkEligibilityForEmployee: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<Result<WorkEligibility | null>>;
	// Document Requirement
	getDocumentRequirementById: (input: {
		organizationId: string;
		requirementId: HumanResourcesDocumentRequirementId;
	}) => Promise<Result<DocumentRequirement | null>>;

	getEmployeeComplianceSummary: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf?: string | undefined;
	}) => Promise<Result<EmployeeComplianceSummary>>;
	// Employee Document
	getEmployeeDocumentById: (input: {
		organizationId: string;
		documentId: HumanResourcesEmployeeDocumentId;
	}) => Promise<Result<EmployeeDocument | null>>;
	// Policy Acknowledgement
	getPolicyAcknowledgementById: (input: {
		organizationId: string;
		acknowledgementId: HumanResourcesPolicyAcknowledgementId;
	}) => Promise<Result<PolicyAcknowledgement | null>>;

	getPolicyAcknowledgementStatus: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		policyCode: string;
		policyVersion?: string | undefined;
	}) => Promise<Result<PolicyAcknowledgement | null>>;
	// Work Eligibility
	getWorkEligibilityById: (input: {
		organizationId: string;
		eligibilityId: HumanResourcesWorkEligibilityId;
	}) => Promise<Result<WorkEligibility | null>>;

	issuePolicyAcknowledgementRequirement: (
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			policyCode: string;
			policyVersion: string;
			dueOn: string;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PolicyAcknowledgement>>;

	listEmployeeDocuments: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
		verificationStatus?: EmployeeDocumentVerificationStatus | undefined;
	}) => Promise<Result<EmployeeDocumentListPage>>;

	listEmployeesWithWorkEligibilityRisk: (input: {
		organizationId: string;
		asOf: string;
		withinDays: number;
		page: number;
		pageSize: number;
	}) => Promise<Result<WorkEligibilityRiskListPage>>;

	listExpiringEmployeeDocuments: (input: {
		organizationId: string;
		asOf: string;
		withinDays: number;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
	}) => Promise<Result<EmployeeDocumentListPage>>;

	listMissingRequiredDocuments: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
	}) => Promise<Result<DocumentRequirementListPage>>;

	listOutstandingPolicyAcknowledgements: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
	}) => Promise<Result<PolicyAcknowledgementListPage>>;

	listOverduePolicyAcknowledgements: (input: {
		organizationId: string;
		asOf: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
	}) => Promise<Result<PolicyAcknowledgementListPage>>;

	listPublishedDocumentRequirements: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
	}) => Promise<Result<DocumentRequirementListPage>>;

	markEmployeeDocumentExpired: (
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeDocument>>;

	publishDocumentRequirement: (
		input: {
			organizationId: string;
			requirementId: HumanResourcesDocumentRequirementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<DocumentRequirement>>;

	recordWorkEligibility: (
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
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<WorkEligibility>>;

	registerEmployeeDocument: (
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
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeDocument>>;

	rejectEmployeeDocument: (
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			rejectionReason: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeDocument>>;

	renewWorkEligibility: (
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
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<WorkEligibility>>;

	retireDocumentRequirement: (
		input: {
			organizationId: string;
			requirementId: HumanResourcesDocumentRequirementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<DocumentRequirement>>;

	revokeEmployeeDocumentVerification: (
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeDocument>>;

	revokePolicyAcknowledgement: (
		input: {
			organizationId: string;
			acknowledgementId: HumanResourcesPolicyAcknowledgementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PolicyAcknowledgement>>;

	supersedePolicyAcknowledgementRequirement: (
		input: {
			organizationId: string;
			acknowledgementId: HumanResourcesPolicyAcknowledgementId;
			newPolicyVersion: string;
			newDueOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PolicyAcknowledgement>>;

	suspendWorkEligibility: (
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<WorkEligibility>>;

	updateDocumentRequirement: (
		input: {
			organizationId: string;
			requirementId: HumanResourcesDocumentRequirementId;
			name?: string | undefined;
			documentType?: string | undefined;
			issuingJurisdiction?: string | null | undefined;
			appliesToNote?: string | null | undefined;
			applicability?: DocumentRequirementApplicability | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<DocumentRequirement>>;

	updateEmployeeDocumentMetadata: (
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			issuingJurisdiction?: string | null | undefined;
			expiresOn?: string | null | undefined;
			metadata?: Record<string, unknown> | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeDocument>>;

	verifyEmployeeDocument: (
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			evidenceDate: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeDocument>>;

	verifyWorkEligibility: (
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			evidenceDate: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<WorkEligibility>>;
}
