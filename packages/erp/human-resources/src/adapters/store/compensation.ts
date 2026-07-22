import type { Result } from "@afenda/errors/result";
import type {
	HumanResourcesBenefitEnrollmentId,
	HumanResourcesBenefitPlanId,
	HumanResourcesCompensationGradeId,
	HumanResourcesCompensationReviewId,
	HumanResourcesEmployeeCompensationId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesSalaryBandId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type {
	BenefitPlanStatus,
	CompensationGradeStatus,
	SalaryBandStatus,
} from "../shared/compensation-status";
import type {
	ApprovedCompensationHandoff,
	BenefitEnrollment,
	BenefitEnrollmentListPage,
	BenefitPlan,
	BenefitPlanListPage,
	CompensationGrade,
	CompensationGradeListPage,
	CompensationReview,
	CompensationReviewListPage,
	EmployeeCompensation,
	EmployeeCompensationListPage,
	SalaryBand,
	SalaryBandListPage,
} from "../types";

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
		meta: { correlationId: string },
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
		meta: { correlationId: string },
	): Promise<Result<CompensationGrade>>;

	archiveCompensationGrade(
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
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
		meta: { correlationId: string },
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
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalaryBand>>;

	archiveSalaryBand(
		input: {
			organizationId: string;
			salaryBandId: HumanResourcesSalaryBandId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalaryBand>>;

	listSalaryBandsByGrade(input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
		page: number;
		pageSize: number;
		status?: SalaryBandStatus;
	}): Promise<Result<SalaryBandListPage>>;
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
			effectiveFrom: string;
			reason: string;
			sourceReviewId: HumanResourcesCompensationReviewId | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
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
		meta: { correlationId: string },
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
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
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
		meta: { correlationId: string },
	): Promise<Result<CompensationReview>>;

	finalizeCompensationReview(
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
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
		meta: { correlationId: string },
	): Promise<Result<EmployeeCompensation>>;

	listCompensationReviewsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<CompensationReviewListPage>>;
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
		meta: { correlationId: string },
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
		meta: { correlationId: string },
	): Promise<Result<BenefitPlan>>;

	archiveBenefitPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitPlan>>;

	listBenefitPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: BenefitPlanStatus;
	}): Promise<Result<BenefitPlanListPage>>;
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
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
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
		meta: { correlationId: string },
	): Promise<Result<BenefitEnrollment>>;

	cancelBenefitEnrollment(
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitEnrollment>>;

	listBenefitEnrollmentsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<BenefitEnrollmentListPage>>;
	// Approved Compensation Handoff
	getApprovedCompensationHandoff(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ApprovedCompensationHandoff | null>>;
};
