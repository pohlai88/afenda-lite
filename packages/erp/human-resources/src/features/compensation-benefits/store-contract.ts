import type { Result } from "@afenda/errors";
import type {
	ApprovedCompensationHandoff,
	BenefitEnrollment,
	BenefitEnrollmentDependent,
	BenefitEnrollmentListPage,
	BenefitPlan,
	BenefitPlanEligibility,
	BenefitPlanListPage,
	CompensationGrade,
	CompensationGradeListPage,
	CompensationGradeProgressionRule,
	CompensationGradeProgressionRuleListPage,
	CompensationProposal,
	CompensationProposalListPage,
	CompensationReview,
	CompensationReviewCycle,
	CompensationReviewCycleListPage,
	CompensationReviewListPage,
	EmployeeCompensation,
	EmployeeCompensationListPage,
	SalaryBand,
	SalaryBandListPage,
} from "../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	HumanResourcesApplicationId,
	HumanResourcesBenefitEnrollmentDependentId,
	HumanResourcesBenefitEnrollmentId,
	HumanResourcesBenefitPlanId,
	HumanResourcesCompensationGradeId,
	HumanResourcesCompensationGradeProgressionRuleId,
	HumanResourcesCompensationProposalId,
	HumanResourcesCompensationReviewCycleId,
	HumanResourcesCompensationReviewId,
	HumanResourcesEmployeeCompensationId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesSalaryBandId,
} from "../../kernel/identity/brands";
import type { EmploymentStatus } from "../workforce-records/employment/employment-status";
import type {
	BenefitDependentRelationship,
	BenefitPlanStatus,
	CompensationGradeStatus,
	CompensationReviewCycleStatus,
	PayFrequency,
	SalaryBandStatus,
} from "./status";

export interface CompensationReviewCycleCreateRecord {
	budgetCurrencyCode: string;
	budgetTotalAmount: string;
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	name: string;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
}

export interface IdempotentCompensationReviewCycleRecord {
	createRequestFingerprint: string;
	cycle: CompensationReviewCycle;
}

/**
 * Persistence contract for Compensation and benefits.
 *
 * This feature owns its narrow persistence contract. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export interface HumanResourcesCompensationStore {
	activateEmployeeCompensation: (
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCompensation>>;

	addBenefitEnrollmentDependent: (
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			dependentName: string;
			relationship: BenefitDependentRelationship;
			effectiveFrom: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<BenefitEnrollmentDependent>>;

	amendCompensationProposal: (
		input: {
			organizationId: string;
			proposalId: HumanResourcesCompensationProposalId;
			proposedBaseAmount?: string | null | undefined;
			proposedCurrencyCode?: string | null | undefined;
			proposedGradeId?: HumanResourcesCompensationGradeId | null | undefined;
			proposedSalaryBandId?: HumanResourcesSalaryBandId | null | undefined;
			confidentialNote?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationProposal>>;

	amendEmployeeCompensation: (
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			baseAmount?: string | undefined;
			currencyCode?: string | undefined;
			payFrequency?: PayFrequency | undefined;
			effectiveFrom?: string | undefined;
			effectiveTo?: string | null | undefined;
			reason?: string | undefined;
			gradeId?: HumanResourcesCompensationGradeId | null | undefined;
			salaryBandId?: HumanResourcesSalaryBandId | null | undefined;
			confidentialNote?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCompensation>>;

	applyApprovedCompensationResult: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			reason: string;
			createIdempotencyKey: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCompensation>>;

	approveCompensationProposal: (
		input: {
			organizationId: string;
			proposalId: HumanResourcesCompensationProposalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationProposal>>;

	approveEmployeeCompensation: (
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCompensation>>;

	archiveBenefitPlan: (
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<BenefitPlan>>;

	archiveCompensationGrade: (
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationGrade>>;

	archiveCompensationGradeProgressionRule: (
		input: {
			organizationId: string;
			progressionRuleId: HumanResourcesCompensationGradeProgressionRuleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationGradeProgressionRule>>;

	archiveSalaryBand: (
		input: {
			organizationId: string;
			salaryBandId: HumanResourcesSalaryBandId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<SalaryBand>>;

	cancelBenefitEnrollment: (
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<BenefitEnrollment>>;

	cancelCompensationReviewCycle: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationReviewCycle>>;

	closeCompensationReviewCycle: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationReviewCycle>>;

	correctEmployeeCompensation: (
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			baseAmount: string;
			currencyCode: string;
			payFrequency: PayFrequency;
			effectiveFrom: string;
			effectiveTo: string | null;
			reason: string;
			evidenceReference: string | null;
			gradeId: HumanResourcesCompensationGradeId | null;
			salaryBandId: HumanResourcesSalaryBandId | null;
			confidentialNote: string | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCompensation>>;

	createBenefitPlan: (
		record: {
			organizationId: string;
			code: string;
			name: string;
			eligibilityNote: string | null;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<BenefitPlan>>;

	createCompensationGrade: (
		record: {
			organizationId: string;
			code: string;
			name: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationGrade>>;

	createCompensationGradeProgressionRule: (
		record: {
			organizationId: string;
			fromGradeId: HumanResourcesCompensationGradeId;
			toGradeId: HumanResourcesCompensationGradeId;
			effectiveFrom: string;
			effectiveTo: string | null;
			minMonthsInGrade: number | null;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationGradeProgressionRule>>;

	createCompensationProposal: (
		record: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
			proposedBaseAmount: string | null;
			proposedCurrencyCode: string | null;
			proposedGradeId: HumanResourcesCompensationGradeId | null;
			proposedSalaryBandId: HumanResourcesSalaryBandId | null;
			confidentialNote: string | null;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationProposal>>;

	createCompensationReviewCycle: (
		record: CompensationReviewCycleCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationReviewCycle>>;

	createCompensationReviewDraft: (
		record: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationReview>>;

	createEmployeeCompensation: (
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			gradeId: HumanResourcesCompensationGradeId | null;
			salaryBandId: HumanResourcesSalaryBandId | null;
			baseAmount: string;
			currencyCode: string;
			payFrequency: PayFrequency;
			effectiveFrom: string;
			effectiveTo: string | null;
			reason: string;
			confidentialNote: string | null;
			supersedesCompensationId: HumanResourcesEmployeeCompensationId | null;
			sourceReviewId: HumanResourcesCompensationReviewId | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCompensation>>;

	createSalaryBand: (
		record: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			currencyCode: string;
			minAmount: string;
			midAmount: string;
			maxAmount: string;
			effectiveFrom: string;
			effectiveTo: string | null;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<SalaryBand>>;

	endBenefitEnrollment: (
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<BenefitEnrollment>>;

	endBenefitEnrollmentDependent: (
		input: {
			organizationId: string;
			dependentId: HumanResourcesBenefitEnrollmentDependentId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<BenefitEnrollmentDependent>>;

	endEmployeeCompensation: (
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCompensation>>;

	enrolBenefit: (
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			planId: HumanResourcesBenefitPlanId;
			effectiveFrom: string;
			effectiveTo: string | null;
			employeeContributionAmount: string | null;
			employerContributionAmount: string | null;
			contributionCurrencyCode: string | null;
			contributionFrequency: PayFrequency | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<BenefitEnrollment>>;

	finalizeCompensationReview: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationReview>>;

	findActiveEmployeeCompensationByEmployment: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}) => Promise<Result<EmployeeCompensation | null>>;

	findBenefitEnrollmentByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<BenefitEnrollment | null>>;

	findBenefitPlanByCode: (input: {
		organizationId: string;
		code: string;
	}) => Promise<Result<BenefitPlan | null>>;

	findCompensationGradeByCode: (input: {
		organizationId: string;
		code: string;
	}) => Promise<Result<CompensationGrade | null>>;

	findCompensationReviewByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<CompensationReview | null>>;

	findCompensationReviewCycleByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentCompensationReviewCycleRecord | null>>;

	findEmployeeCompensationByEmploymentAsOf: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}) => Promise<Result<EmployeeCompensation | null>>;

	findEmployeeCompensationByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<EmployeeCompensation | null>>;

	findSalaryBandByGradeAndCurrencyAsOf: (input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
		currencyCode: string;
		asOf: string;
	}) => Promise<Result<SalaryBand | null>>;
	// Approved Compensation Handoff
	getApprovedCompensationHandoff: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		employmentId: HumanResourcesEmploymentId;
		effectiveDate: string;
	}) => Promise<Result<ApprovedCompensationHandoff | null>>;
	// Benefit Enrollment
	getBenefitEnrollment: (input: {
		organizationId: string;
		enrollmentId: HumanResourcesBenefitEnrollmentId;
	}) => Promise<Result<BenefitEnrollment | null>>;

	getBenefitEnrollmentDependent: (input: {
		organizationId: string;
		dependentId: HumanResourcesBenefitEnrollmentDependentId;
	}) => Promise<Result<BenefitEnrollmentDependent | null>>;
	// Benefit Plan
	getBenefitPlan: (input: {
		organizationId: string;
		planId: HumanResourcesBenefitPlanId;
	}) => Promise<Result<BenefitPlan | null>>;

	getBenefitPlanEligibility: (input: {
		organizationId: string;
		planId: HumanResourcesBenefitPlanId;
	}) => Promise<Result<BenefitPlanEligibility | null>>;
	// Compensation Grade
	getCompensationGrade: (input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
	}) => Promise<Result<CompensationGrade | null>>;

	// Compensation grade progression rule
	getCompensationGradeProgressionRule: (input: {
		organizationId: string;
		progressionRuleId: HumanResourcesCompensationGradeProgressionRuleId;
	}) => Promise<Result<CompensationGradeProgressionRule | null>>;
	// Compensation Proposal (pre-hire)
	getCompensationProposal: (input: {
		organizationId: string;
		proposalId: HumanResourcesCompensationProposalId;
	}) => Promise<Result<CompensationProposal | null>>;
	// Compensation Review
	getCompensationReview: (input: {
		organizationId: string;
		reviewId: HumanResourcesCompensationReviewId;
	}) => Promise<Result<CompensationReview | null>>;
	// Compensation Review Cycle
	getCompensationReviewCycle: (input: {
		organizationId: string;
		cycleId: HumanResourcesCompensationReviewCycleId;
	}) => Promise<Result<CompensationReviewCycle | null>>;
	// Employee Compensation
	getEmployeeCompensation: (input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
	}) => Promise<Result<EmployeeCompensation | null>>;
	// Salary Band
	getSalaryBand: (input: {
		organizationId: string;
		salaryBandId: HumanResourcesSalaryBandId;
	}) => Promise<Result<SalaryBand | null>>;

	listBenefitEnrollmentDependentsByEnrollment: (input: {
		organizationId: string;
		enrollmentId: HumanResourcesBenefitEnrollmentId;
	}) => Promise<Result<BenefitEnrollmentDependent[]>>;

	listBenefitEnrollmentsByEmployee: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}) => Promise<Result<BenefitEnrollmentListPage>>;

	listBenefitPlans: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: BenefitPlanStatus | undefined;
	}) => Promise<Result<BenefitPlanListPage>>;

	listCompensationGradeProgressionRulesFromGrade: (input: {
		organizationId: string;
		fromGradeId: HumanResourcesCompensationGradeId;
		page: number;
		pageSize: number;
		asOf?: string | undefined;
	}) => Promise<Result<CompensationGradeProgressionRuleListPage>>;

	listCompensationGrades: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CompensationGradeStatus | undefined;
	}) => Promise<Result<CompensationGradeListPage>>;

	listCompensationProposals: (input: {
		organizationId: string;
		applicationId?: HumanResourcesApplicationId | undefined;
		page: number;
		pageSize: number;
	}) => Promise<Result<CompensationProposalListPage>>;

	listCompensationReviewCycles: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CompensationReviewCycleStatus | undefined;
	}) => Promise<Result<CompensationReviewCycleListPage>>;

	listCompensationReviewsByCycle: (input: {
		organizationId: string;
		cycleId: HumanResourcesCompensationReviewCycleId;
	}) => Promise<Result<CompensationReview[]>>;

	listCompensationReviewsByEmployee: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}) => Promise<Result<CompensationReviewListPage>>;

	listEligibleProgressionTargets: (input: {
		organizationId: string;
		fromGradeId: HumanResourcesCompensationGradeId;
		asOf: string;
	}) => Promise<Result<CompensationGradeProgressionRule[]>>;

	listEmployeeCompensationsByEmployee: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}) => Promise<Result<EmployeeCompensationListPage>>;

	listSalaryBandsByGrade: (input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
		page: number;
		pageSize: number;
		status?: SalaryBandStatus | undefined;
	}) => Promise<Result<SalaryBandListPage>>;

	openCompensationReviewCycle: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationReviewCycle>>;

	recordCompensationRecommendation: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			proposedBaseAmount: string;
			proposedCurrencyCode: string;
			proposedGradeId: HumanResourcesCompensationGradeId | null;
			proposedSalaryBandId: HumanResourcesSalaryBandId | null;
			recommendationNote: string | null;
			effectiveFrom: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationReview>>;

	scheduleEmployeeCompensationChange: (
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			baseAmount: string;
			currencyCode: string;
			payFrequency: PayFrequency;
			effectiveFrom: string;
			reason: string;
			gradeId: HumanResourcesCompensationGradeId | null;
			salaryBandId: HumanResourcesSalaryBandId | null;
			confidentialNote: string | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCompensation>>;

	setBenefitPlanEligibility: (
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			minTenureDays: number | null;
			allowedEmploymentStatuses: EmploymentStatus[];
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<BenefitPlanEligibility>>;

	supersedeSalaryBand: (
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			currencyCode: string;
			minAmount: string;
			midAmount: string;
			maxAmount: string;
			effectiveFrom: string;
			effectiveTo: string | null;
			supersededSalaryBandId?: HumanResourcesSalaryBandId | undefined;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<{ superseded: SalaryBand; successor: SalaryBand }>>;

	updateBenefitPlan: (
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			name?: string | undefined;
			eligibilityNote?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<BenefitPlan>>;

	updateCompensationGrade: (
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			name?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompensationGrade>>;

	waiveBenefit: (
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			waiverReason: string;
			effectiveTo: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<BenefitEnrollment>>;
}
