import type { Result } from "@afenda/errors/result";
import type {
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
	HumanResourcesApplicationId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type { EmploymentStatus } from "../shared/employment-status";
import type {
	BenefitPlanStatus,
	BenefitDependentRelationship,
	CompensationGradeStatus,
	CompensationReviewCycleStatus,
	PayFrequency,
	SalaryBandStatus,
} from "../shared/compensation-status";
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";
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
} from "../types";

export type CompensationReviewCycleCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	periodStart: string;
	periodEnd: string;
	budgetTotalAmount: string;
	budgetCurrencyCode: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentCompensationReviewCycleRecord = {
	cycle: CompensationReviewCycle;
	createRequestFingerprint: string;
};

/**
 * Persistence contract for Compensation and benefits.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export type HumanResourcesCompensationStore = {
	// Compensation Grade
	getCompensationGrade(input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
	}): Promise<Result<CompensationGrade | null>>;

	findCompensationGradeByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<CompensationGrade | null>>;

	createCompensationGrade(
		record: {
			organizationId: string;
			code: string;
			name: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationGrade>>;

	updateCompensationGrade(
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			name?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationGrade>>;

	archiveCompensationGrade(
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationGrade>>;

	listCompensationGrades(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CompensationGradeStatus;
	}): Promise<Result<CompensationGradeListPage>>;
	// Salary Band
	getSalaryBand(input: {
		organizationId: string;
		salaryBandId: HumanResourcesSalaryBandId;
	}): Promise<Result<SalaryBand | null>>;

	createSalaryBand(
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
	): Promise<Result<SalaryBand>>;

	supersedeSalaryBand(
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			currencyCode: string;
			minAmount: string;
			midAmount: string;
			maxAmount: string;
			effectiveFrom: string;
			effectiveTo: string | null;
			supersededSalaryBandId?: HumanResourcesSalaryBandId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<{ superseded: SalaryBand; successor: SalaryBand }>>;

	archiveSalaryBand(
		input: {
			organizationId: string;
			salaryBandId: HumanResourcesSalaryBandId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<SalaryBand>>;

	listSalaryBandsByGrade(input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
		page: number;
		pageSize: number;
		status?: SalaryBandStatus;
	}): Promise<Result<SalaryBandListPage>>;

	findSalaryBandByGradeAndCurrencyAsOf(input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
		currencyCode: string;
		asOf: string;
	}): Promise<Result<SalaryBand | null>>;

	// Compensation grade progression rule
	getCompensationGradeProgressionRule(input: {
		organizationId: string;
		progressionRuleId: HumanResourcesCompensationGradeProgressionRuleId;
	}): Promise<Result<CompensationGradeProgressionRule | null>>;

	createCompensationGradeProgressionRule(
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
	): Promise<Result<CompensationGradeProgressionRule>>;

	archiveCompensationGradeProgressionRule(
		input: {
			organizationId: string;
			progressionRuleId: HumanResourcesCompensationGradeProgressionRuleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationGradeProgressionRule>>;

	listCompensationGradeProgressionRulesFromGrade(input: {
		organizationId: string;
		fromGradeId: HumanResourcesCompensationGradeId;
		page: number;
		pageSize: number;
		asOf?: string;
	}): Promise<Result<CompensationGradeProgressionRuleListPage>>;

	listEligibleProgressionTargets(input: {
		organizationId: string;
		fromGradeId: HumanResourcesCompensationGradeId;
		asOf: string;
	}): Promise<Result<CompensationGradeProgressionRule[]>>;
	// Employee Compensation
	getEmployeeCompensation(input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
	}): Promise<Result<EmployeeCompensation | null>>;

	findEmployeeCompensationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<EmployeeCompensation | null>>;

	createEmployeeCompensation(
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
	): Promise<Result<EmployeeCompensation>>;

	amendEmployeeCompensation(
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			baseAmount?: string;
			currencyCode?: string;
			payFrequency?: PayFrequency;
			effectiveFrom?: string;
			effectiveTo?: string | null;
			reason?: string;
			gradeId?: HumanResourcesCompensationGradeId | null;
			salaryBandId?: HumanResourcesSalaryBandId | null;
			confidentialNote?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmployeeCompensation>>;

	approveEmployeeCompensation(
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmployeeCompensation>>;

	scheduleEmployeeCompensationChange(
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
	): Promise<Result<EmployeeCompensation>>;

	activateEmployeeCompensation(
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmployeeCompensation>>;

	correctEmployeeCompensation(
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
	): Promise<Result<EmployeeCompensation>>;

	endEmployeeCompensation(
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmployeeCompensation>>;

	listEmployeeCompensationsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<EmployeeCompensationListPage>>;

	findActiveEmployeeCompensationByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<EmployeeCompensation | null>>;

	findEmployeeCompensationByEmploymentAsOf(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}): Promise<Result<EmployeeCompensation | null>>;
	// Compensation Review Cycle
	getCompensationReviewCycle(input: {
		organizationId: string;
		cycleId: HumanResourcesCompensationReviewCycleId;
	}): Promise<Result<CompensationReviewCycle | null>>;

	findCompensationReviewCycleByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCompensationReviewCycleRecord | null>>;

	createCompensationReviewCycle(
		record: CompensationReviewCycleCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>>;

	openCompensationReviewCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>>;

	closeCompensationReviewCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>>;

	cancelCompensationReviewCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>>;

	listCompensationReviewCycles(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CompensationReviewCycleStatus;
	}): Promise<Result<CompensationReviewCycleListPage>>;

	listCompensationReviewsByCycle(input: {
		organizationId: string;
		cycleId: HumanResourcesCompensationReviewCycleId;
	}): Promise<Result<CompensationReview[]>>;
	// Compensation Review
	getCompensationReview(input: {
		organizationId: string;
		reviewId: HumanResourcesCompensationReviewId;
	}): Promise<Result<CompensationReview | null>>;

	findCompensationReviewByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<CompensationReview | null>>;

	createCompensationReviewDraft(
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
	): Promise<Result<CompensationReview>>;

	recordCompensationRecommendation(
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
	): Promise<Result<CompensationReview>>;

	finalizeCompensationReview(
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReview>>;

	applyApprovedCompensationResult(
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			reason: string;
			createIdempotencyKey: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmployeeCompensation>>;

	listCompensationReviewsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<CompensationReviewListPage>>;
	// Compensation Proposal (pre-hire)
	getCompensationProposal(input: {
		organizationId: string;
		proposalId: HumanResourcesCompensationProposalId;
	}): Promise<Result<CompensationProposal | null>>;

	createCompensationProposal(
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
	): Promise<Result<CompensationProposal>>;

	amendCompensationProposal(
		input: {
			organizationId: string;
			proposalId: HumanResourcesCompensationProposalId;
			proposedBaseAmount?: string | null;
			proposedCurrencyCode?: string | null;
			proposedGradeId?: HumanResourcesCompensationGradeId | null;
			proposedSalaryBandId?: HumanResourcesSalaryBandId | null;
			confidentialNote?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationProposal>>;

	approveCompensationProposal(
		input: {
			organizationId: string;
			proposalId: HumanResourcesCompensationProposalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationProposal>>;

	listCompensationProposals(input: {
		organizationId: string;
		applicationId?: HumanResourcesApplicationId;
		page: number;
		pageSize: number;
	}): Promise<Result<CompensationProposalListPage>>;
	// Benefit Plan
	getBenefitPlan(input: {
		organizationId: string;
		planId: HumanResourcesBenefitPlanId;
	}): Promise<Result<BenefitPlan | null>>;

	findBenefitPlanByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<BenefitPlan | null>>;

	createBenefitPlan(
		record: {
			organizationId: string;
			code: string;
			name: string;
			eligibilityNote: string | null;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<BenefitPlan>>;

	updateBenefitPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			name?: string;
			eligibilityNote?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<BenefitPlan>>;

	archiveBenefitPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<BenefitPlan>>;

	listBenefitPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: BenefitPlanStatus;
	}): Promise<Result<BenefitPlanListPage>>;

	getBenefitPlanEligibility(input: {
		organizationId: string;
		planId: HumanResourcesBenefitPlanId;
	}): Promise<Result<BenefitPlanEligibility | null>>;

	setBenefitPlanEligibility(
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			minTenureDays: number | null;
			allowedEmploymentStatuses: EmploymentStatus[];
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<BenefitPlanEligibility>>;
	// Benefit Enrollment
	getBenefitEnrollment(input: {
		organizationId: string;
		enrollmentId: HumanResourcesBenefitEnrollmentId;
	}): Promise<Result<BenefitEnrollment | null>>;

	findBenefitEnrollmentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<BenefitEnrollment | null>>;

	enrolBenefit(
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
	): Promise<Result<BenefitEnrollment>>;

	waiveBenefit(
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
	): Promise<Result<BenefitEnrollment>>;

	endBenefitEnrollment(
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<BenefitEnrollment>>;

	cancelBenefitEnrollment(
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<BenefitEnrollment>>;

	listBenefitEnrollmentsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<BenefitEnrollmentListPage>>;

	getBenefitEnrollmentDependent(input: {
		organizationId: string;
		dependentId: HumanResourcesBenefitEnrollmentDependentId;
	}): Promise<Result<BenefitEnrollmentDependent | null>>;

	listBenefitEnrollmentDependentsByEnrollment(input: {
		organizationId: string;
		enrollmentId: HumanResourcesBenefitEnrollmentId;
	}): Promise<Result<BenefitEnrollmentDependent[]>>;

	addBenefitEnrollmentDependent(
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
	): Promise<Result<BenefitEnrollmentDependent>>;

	endBenefitEnrollmentDependent(
		input: {
			organizationId: string;
			dependentId: HumanResourcesBenefitEnrollmentDependentId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<BenefitEnrollmentDependent>>;
	// Approved Compensation Handoff
	getApprovedCompensationHandoff(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ApprovedCompensationHandoff | null>>;
};
