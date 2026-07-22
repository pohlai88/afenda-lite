import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
} from "@afenda/events/schemas";

import {
	type HumanResourcesApplicationId,
	type HumanResourcesAssignmentId,
	type HumanResourcesBenefitEnrollmentId,
	type HumanResourcesBenefitPlanId,
	type HumanResourcesCandidateId,
	type HumanResourcesClearanceId,
	type HumanResourcesCompensationGradeId,
	type HumanResourcesCompensationReviewId,
	type HumanResourcesDepartmentId,
	type HumanResourcesEmployeeCompensationId,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentConfirmationId,
	type HumanResourcesEmploymentContractId,
	type HumanResourcesEmploymentId,
	type HumanResourcesInterviewId,
	type HumanResourcesJobId,
	type HumanResourcesOffboardingCaseId,
	type HumanResourcesOffboardingTaskId,
	type HumanResourcesOfferId,
	type HumanResourcesOnboardingCaseId,
	type HumanResourcesOnboardingTaskId,
	type HumanResourcesPositionId,
	type HumanResourcesProbationReviewId,
	type HumanResourcesReportingLineId,
	type HumanResourcesRequisitionId,
	type HumanResourcesSalaryBandId,
	type HumanResourcesTerminationId,
	parseHumanResourcesApplicationId,
	parseHumanResourcesAssignmentId,
	parseHumanResourcesBenefitEnrollmentId,
	parseHumanResourcesBenefitPlanId,
	parseHumanResourcesCandidateId,
	parseHumanResourcesClearanceId,
	parseHumanResourcesCompensationGradeId,
	parseHumanResourcesCompensationReviewId,
	parseHumanResourcesDepartmentId,
	parseHumanResourcesEmployeeCompensationId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentConfirmationId,
	parseHumanResourcesEmploymentContractId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesEmploymentMovementId,
	parseHumanResourcesExitInterviewId,
	parseHumanResourcesInterviewEvaluationId,
	parseHumanResourcesInterviewId,
	parseHumanResourcesJobId,
	parseHumanResourcesOffboardingCaseId,
	parseHumanResourcesOffboardingTaskId,
	parseHumanResourcesOfferId,
	parseHumanResourcesOnboardingCaseId,
	parseHumanResourcesOnboardingTaskId,
	parseHumanResourcesPositionId,
	parseHumanResourcesProbationReviewId,
	parseHumanResourcesReportingLineId,
	parseHumanResourcesRequisitionId,
	parseHumanResourcesSalaryBandId,
	parseHumanResourcesTerminationId,
} from "./brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "./error-codes";
import type { MutationPorts } from "./ports";
import { assertExpectedVersion } from "./shared/concurrency";
import {
	isCompensationGradeActive,
	isEmployeeCompensationActive,
	isSalaryBandActive,
	isCompensationReviewFinalized,
	isBenefitEnrollmentActive,
} from "./shared/compensation-status";
import {
	compareMoneyOrder,
	rangesOverlap,
} from "./shared/compensation-money";
import {
	assertActivePosition,
	conflict,
	invalidInput,
	invalidState,
	notFound,
} from "./shared/domain-guards";
import {
	assertValidDateRange,
	type DepartmentStatus,
	type EmploymentStatus,
	employmentStatusSchema,
	type JobStatus,
	type PositionStatus,
	positionStatusSchema,
} from "./shared/employment-status";
import { fingerprintTransfer } from "./shared/fingerprint";
import {
	assertClearanceStatusTransition,
	assertEmploymentActiveForOnboarding,
	assertEmploymentForOffboarding,
	assertLatestProbationPassed,
	assertLifecycleTaskStatusTransition,
	assertOffboardingCaseInProgress,
	assertOffboardingReadyToComplete,
	assertOnboardingCaseInProgress,
	assertProbationDateRange,
	assertProbationExtension,
	assertProbationOpen,
	assertTerminationEffectiveDate,
} from "./shared/lifecycle-guards";
import type {
	LifecycleTaskStatus,
	ProbationOutcome,
} from "./shared/lifecycle-status";
import {
	assertActiveDepartment,
	assertActiveJob,
	assertDepartmentParentAcyclic,
	assertDepartmentStatusTransition,
	assertJobStatusTransition,
	assertNoPrimaryReportingOverlap,
	assertPositionStatusTransition,
	assertReportingLineAcyclic,
	buildBoundedDepartmentTree,
} from "./shared/organization-guards";
import { mapEmployeeNumberDuplicate } from "./shared/persistence-errors";
import {
	assertApplicationEligibleForOffer,
	assertApplicationStatusTransition,
	assertCandidateActive,
	assertInterviewSchedulable,
	assertInterviewStatusTransition,
	assertOfferAcceptable,
	assertOfferAmendable,
	assertOfferStatusTransition,
	assertRequisitionAmendable,
	assertRequisitionOpenForApplication,
	assertRequisitionStatusTransition,
} from "./shared/recruitment-guards";
import type {
	ApplicationStatus,
	CandidateStatus,
	OfferStatus,
	RequisitionStatus,
} from "./shared/recruitment-status";
import {
	isApplicationTerminal,
	isOfferActive,
} from "./shared/recruitment-status";
import type { HumanResourcesStore } from "./store";
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
} from "./types";

function cloneEmployee(employee: Employee): Employee {
	return { ...employee };
}

function cloneRequisition(requisition: JobRequisition): JobRequisition {
	return { ...requisition };
}

function cloneCandidate(candidate: Candidate): Candidate {
	return { ...candidate };
}

function cloneApplication(
	application: CandidateApplication,
): CandidateApplication {
	return { ...application };
}

function cloneInterview(interview: Interview): Interview {
	return { ...interview };
}

function cloneEvaluation(evaluation: InterviewEvaluation): InterviewEvaluation {
	return { ...evaluation };
}

function cloneOffer(offer: EmploymentOffer): EmploymentOffer {
	return { ...offer };
}

function cloneHandoff(handoff: OfferAcceptanceHandoff): OfferAcceptanceHandoff {
	return {
		...handoff,
		acceptedAt: new Date(handoff.acceptedAt),
		offer: cloneOffer(handoff.offer),
	};
}

function cloneOnboardingCase(value: OnboardingCase): OnboardingCase {
	return {
		...value,
		startedAt: new Date(value.startedAt),
		completedAt: value.completedAt ? new Date(value.completedAt) : null,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneProbationReview(value: ProbationReview): ProbationReview {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneEmploymentConfirmation(
	value: EmploymentConfirmation,
): EmploymentConfirmation {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneEmploymentMovement(
	value: EmploymentMovement,
): EmploymentMovement {
	return {
		...value,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneTermination(value: Termination): Termination {
	return {
		...value,
		finalizedAt: value.finalizedAt ? new Date(value.finalizedAt) : null,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function cloneOffboardingCase(value: OffboardingCase): OffboardingCase {
	return {
		...value,
		startedAt: new Date(value.startedAt),
		completedAt: value.completedAt ? new Date(value.completedAt) : null,
		createdAt: new Date(value.createdAt),
		updatedAt: new Date(value.updatedAt),
	};
}

function mapEmployee(
	id: HumanResourcesEmployeeId,
	record: EmployeeCreateRecord,
	now: Date,
): Employee {
	return {
		id,
		organizationId: record.organizationId,
		employeeNumber: record.employeeNumber,
		legalName: record.legalName,
		version: 1,
		createdBy: record.createdBy,
		updatedBy: record.createdBy,
		createdAt: now,
		updatedAt: now,
	};
}

/** In-memory Human Resources store for Vitest domain tests. */
export class MemoryHumanResourcesStore implements HumanResourcesStore {
	private readonly employees = new Map<string, Employee>();
	private readonly idempotencyByKey = new Map<
		string,
		IdempotentEmployeeRecord
	>();
	private readonly employments = new Map<string, Employment>();
	private readonly contracts = new Map<string, EmploymentContract>();
	private readonly departments = new Map<string, Department>();
	private readonly jobs = new Map<string, Job>();
	private readonly positions = new Map<string, Position>();
	private readonly assignments = new Map<string, WorkAssignment>();
	private readonly reportingLines = new Map<string, ReportingLine>();
	private readonly requisitions = new Map<string, JobRequisition>();
	private readonly requisitionIdempotencyByKey = new Map<
		string,
		IdempotentRequisitionRecord
	>();
	private readonly candidates = new Map<string, Candidate>();
	private readonly candidateIdempotencyByKey = new Map<
		string,
		IdempotentCandidateRecord
	>();
	private readonly candidateByNormalizedEmail = new Map<string, string>();
	private readonly applications = new Map<string, CandidateApplication>();
	private readonly interviews = new Map<string, Interview>();
	private readonly interviewEvaluations = new Map<
		string,
		InterviewEvaluation
	>();
	private readonly interviewEvaluationByInterviewId = new Map<string, string>();
	private readonly offers = new Map<string, EmploymentOffer>();
	private readonly offerAcceptIdempotencyByKey = new Map<
		string,
		IdempotentOfferAcceptRecord
	>();
	private readonly onboardingCases = new Map<string, OnboardingCase>();
	private readonly onboardingTasks = new Map<string, OnboardingTask>();
	private readonly onboardingIdempotencyByKey = new Map<
		string,
		IdempotentOnboardingCaseRecord
	>();
	private readonly probationReviews = new Map<string, ProbationReview>();
	private readonly probationIdempotencyByKey = new Map<
		string,
		IdempotentProbationReviewRecord
	>();
	private readonly employmentConfirmations = new Map<
		string,
		EmploymentConfirmation
	>();
	private readonly confirmationIdempotencyByKey = new Map<
		string,
		IdempotentEmploymentConfirmationRecord
	>();
	private readonly employmentMovements = new Map<string, EmploymentMovement>();
	private readonly transferIdempotencyByKey = new Map<
		string,
		IdempotentEmploymentMovementRecord
	>();
	private readonly terminations = new Map<string, Termination>();
	private readonly terminationIdempotencyByKey = new Map<
		string,
		IdempotentTerminationRecord
	>();
	private readonly offboardingCases = new Map<string, OffboardingCase>();
	private readonly offboardingTasks = new Map<string, OffboardingTask>();
	private readonly exitInterviews = new Map<string, ExitInterview>();
	private readonly clearances = new Map<string, Clearance>();
	private readonly offboardingIdempotencyByKey = new Map<
		string,
		IdempotentOffboardingCaseRecord
	>();
	private readonly compensationGrades = new Map<string, CompensationGrade>();
	private readonly salaryBands = new Map<string, SalaryBand>();
	private readonly employeeCompensations = new Map<
		string,
		EmployeeCompensation
	>();
	private readonly compensationIdempotencyByKey = new Map<
		string,
		EmployeeCompensation
	>();
	private readonly compensationReviews = new Map<
		string,
		CompensationReview
	>();
	private readonly reviewIdempotencyByKey = new Map<
		string,
		CompensationReview
	>();
	private readonly benefitPlans = new Map<string, BenefitPlan>();
	private readonly benefitEnrollments = new Map<string, BenefitEnrollment>();
	private readonly enrollmentIdempotencyByKey = new Map<
		string,
		BenefitEnrollment
	>();

	private idempotencyMapKey(organizationId: string, idempotencyKey: string) {
		return `${organizationId}:${idempotencyKey}`;
	}

	/** Clear all in-memory state for test isolation. */
	reset(): void {
		this.employees.clear();
		this.idempotencyByKey.clear();
		this.employments.clear();
		this.contracts.clear();
		this.departments.clear();
		this.jobs.clear();
		this.positions.clear();
		this.assignments.clear();
		this.reportingLines.clear();
		this.requisitions.clear();
		this.requisitionIdempotencyByKey.clear();
		this.candidates.clear();
		this.candidateIdempotencyByKey.clear();
		this.candidateByNormalizedEmail.clear();
		this.applications.clear();
		this.interviews.clear();
		this.interviewEvaluations.clear();
		this.interviewEvaluationByInterviewId.clear();
		this.offers.clear();
		this.offerAcceptIdempotencyByKey.clear();
		this.onboardingCases.clear();
		this.onboardingTasks.clear();
		this.onboardingIdempotencyByKey.clear();
		this.probationReviews.clear();
		this.probationIdempotencyByKey.clear();
		this.employmentConfirmations.clear();
		this.confirmationIdempotencyByKey.clear();
		this.employmentMovements.clear();
		this.transferIdempotencyByKey.clear();
		this.terminations.clear();
		this.terminationIdempotencyByKey.clear();
		this.offboardingCases.clear();
		this.offboardingTasks.clear();
		this.exitInterviews.clear();
		this.clearances.clear();
		this.offboardingIdempotencyByKey.clear();
	}

	// Employee methods
	async getEmployeeById(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employee | null>> {
		const employee = this.employees.get(input.employeeId);
		if (employee === undefined) {
			return ok(null);
		}
		if (employee.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(cloneEmployee(employee));
	}

	async findEmployeeByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmployeeRecord | null>> {
		const record = this.idempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			employee: cloneEmployee(record.employee),
			createRequestFingerprint: record.createRequestFingerprint,
		});
	}

	async createEmployee(
		record: EmployeeCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employee>> {
		const existingByKey = await this.findEmployeeByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			return ok(cloneEmployee(existingByKey.data.employee));
		}

		for (const employee of this.employees.values()) {
			if (
				employee.organizationId === record.organizationId &&
				employee.employeeNumber.toUpperCase() ===
					record.normalizedEmployeeNumber
			) {
				return mapEmployeeNumberDuplicate();
			}
		}

		const idResult = parseHumanResourcesEmployeeId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const employee = mapEmployee(idResult.data, record, now);
		this.employees.set(employee.id, employee);
		this.idempotencyByKey.set(
			this.idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			),
			{
				employee: cloneEmployee(employee),
				createRequestFingerprint: record.createRequestFingerprint,
			},
		);

		const audit = await ports.audit.record({
			organizationId: employee.organizationId,
			actorUserId: employee.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employee",
			entityId: employee.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.employees.delete(employee.id);
			this.idempotencyByKey.delete(
				this.idempotencyMapKey(
					record.organizationId,
					record.createIdempotencyKey,
				),
			);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: employee.organizationId,
			actorUserId: employee.createdBy,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
			payload: {
				organizationId: employee.organizationId,
				entityType: "hr_employee",
				entityId: employee.id,
				actorId: employee.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.employees.delete(employee.id);
			this.idempotencyByKey.delete(
				this.idempotencyMapKey(
					record.organizationId,
					record.createIdempotencyKey,
				),
			);
			return outbox;
		}

		return ok(cloneEmployee(employee));
	}

	async updateEmployee(
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			legalName: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employee>> {
		const employee = this.employees.get(input.employeeId);
		if (!employee || employee.organizationId !== input.organizationId) {
			return fail(
				"NOT_FOUND",
				"Employee not found",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
			);
		}

		const versionCheck = assertExpectedVersion(
			employee.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const now = new Date();
		const updated: Employee = {
			...employee,
			legalName: input.legalName,
			version: employee.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.employees.set(input.employeeId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employee",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.employees.set(input.employeeId, employee);
			return audit;
		}

		return ok(cloneEmployee(updated));
	}

	async listEmployees(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeNumberPrefix?: string;
		legalNamePrefix?: string;
		employmentStatus?: string;
	}): Promise<Result<EmployeeListPage>> {
		let filtered = Array.from(this.employees.values()).filter(
			(e) => e.organizationId === input.organizationId,
		);

		if (input.employeeNumberPrefix) {
			const prefix = input.employeeNumberPrefix.toUpperCase();
			filtered = filtered.filter((e) =>
				e.employeeNumber.toUpperCase().startsWith(prefix),
			);
		}

		if (input.legalNamePrefix) {
			const prefix = input.legalNamePrefix.toUpperCase();
			filtered = filtered.filter((e) =>
				e.legalName.toUpperCase().startsWith(prefix),
			);
		}

		if (input.employmentStatus) {
			const employeeIds = Array.from(this.employments.values())
				.filter(
					(emp) =>
						emp.organizationId === input.organizationId &&
						emp.status === input.employmentStatus,
				)
				.map((emp) => emp.employeeId);
			filtered = filtered.filter((e) => employeeIds.includes(e.id));
		}

		filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const employees = filtered
			.slice(start, start + input.pageSize)
			.map(cloneEmployee);

		return ok({
			employees,
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// Employment methods
	async getEmploymentById(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<Employment | null>> {
		const employment = this.employments.get(input.employmentId);
		if (!employment || employment.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...employment });
	}

	async findOpenEmploymentByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employment | null>> {
		for (const employment of this.employments.values()) {
			if (
				employment.organizationId === input.organizationId &&
				employment.employeeId === input.employeeId &&
				employment.endsOn === null
			) {
				return ok({ ...employment });
			}
		}
		return ok(null);
	}

	async createEmployment(
		record: EmploymentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employment>> {
		const employee = this.employees.get(record.employeeId);
		if (!employee || employee.organizationId !== record.organizationId) {
			return fail(
				"NOT_FOUND",
				"Employee not found",
				humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				),
			);
		}

		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const existingOpen = await this.findOpenEmploymentByEmployee({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!existingOpen.ok) {
			return existingOpen;
		}
		if (existingOpen.data !== null) {
			return fail(
				"CONFLICT",
				"Employee already has an open employment",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}

		const idResult = parseHumanResourcesEmploymentId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const employment: Employment = {
			id: idResult.data,
			organizationId: record.organizationId,
			employeeId: record.employeeId,
			status: "active",
			startsOn: record.startsOn,
			endsOn: record.endsOn,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.employments.set(employment.id, employment);

		const audit = await ports.audit.record({
			organizationId: employment.organizationId,
			actorUserId: employment.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employment",
			entityId: employment.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.employments.delete(employment.id);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: employment.organizationId,
			actorUserId: employment.createdBy,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
			payload: {
				organizationId: employment.organizationId,
				entityType: "hr_employment",
				entityId: employment.id,
				actorId: employment.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.employments.delete(employment.id);
			return outbox;
		}

		return ok({ ...employment });
	}

	async amendEmployment(
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			status?: EmploymentStatus;
			startsOn?: string;
			endsOn?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employment>> {
		const employment = this.employments.get(input.employmentId);
		if (!employment || employment.organizationId !== input.organizationId) {
			return fail(
				"NOT_FOUND",
				"Employment not found",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
			);
		}

		const versionCheck = assertExpectedVersion(
			employment.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const newStartsOn = input.startsOn ?? employment.startsOn;
		const newEndsOn =
			input.endsOn !== undefined ? input.endsOn : employment.endsOn;
		const nextStatus = input.status ?? employment.status;
		const parsedStatus = employmentStatusSchema.safeParse(nextStatus);
		if (!parsedStatus.success) {
			return fail(
				"BAD_REQUEST",
				"Invalid employment status",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}

		const dateCheck = assertValidDateRange(newStartsOn, newEndsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const now = new Date();
		const updated: Employment = {
			...employment,
			status: parsedStatus.data,
			startsOn: newStartsOn,
			endsOn: newEndsOn,
			version: employment.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.employments.set(input.employmentId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employment",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.employments.set(input.employmentId, employment);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
			payload: {
				organizationId: updated.organizationId,
				entityType: "hr_employment",
				entityId: updated.id,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.employments.set(input.employmentId, employment);
			return outbox;
		}

		if (
			parsedStatus.data === "terminated" &&
			employment.status !== "terminated"
		) {
			const terminated = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_employee",
					entityId: updated.employeeId,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!terminated.ok) {
				this.employments.set(input.employmentId, employment);
				return terminated;
			}
		}

		return ok({ ...updated });
	}

	// Employment Contract methods
	async getEmploymentContractById(input: {
		organizationId: string;
		employmentContractId: HumanResourcesEmploymentContractId;
	}): Promise<Result<EmploymentContract | null>> {
		const contract = this.contracts.get(input.employmentContractId);
		if (!contract || contract.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...contract });
	}

	async findContractByEmploymentAndCode(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		referenceCode: string;
	}): Promise<Result<EmploymentContract | null>> {
		for (const contract of this.contracts.values()) {
			if (
				contract.organizationId === input.organizationId &&
				contract.employmentId === input.employmentId &&
				contract.referenceCode === input.referenceCode
			) {
				return ok({ ...contract });
			}
		}
		return ok(null);
	}

	async createEmploymentContract(
		record: EmploymentContractCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentContract>> {
		const employment = this.employments.get(record.employmentId);
		if (!employment || employment.organizationId !== record.organizationId) {
			return fail(
				"NOT_FOUND",
				"Employment not found",
				humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				),
			);
		}

		if (employment.employeeId !== record.employeeId) {
			return fail(
				"BAD_REQUEST",
				"Employee does not match employment",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}

		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const existing = await this.findContractByEmploymentAndCode({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
			referenceCode: record.referenceCode,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Contract with this reference code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const idResult = parseHumanResourcesEmploymentContractId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const contract: EmploymentContract = {
			id: idResult.data,
			organizationId: record.organizationId,
			employmentId: record.employmentId,
			employeeId: record.employeeId,
			referenceCode: record.referenceCode,
			startsOn: record.startsOn,
			endsOn: record.endsOn,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.contracts.set(contract.id, contract);

		const audit = await ports.audit.record({
			organizationId: contract.organizationId,
			actorUserId: contract.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employment_contract",
			entityId: contract.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.contracts.delete(contract.id);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: contract.organizationId,
			actorUserId: contract.createdBy,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
			payload: {
				organizationId: contract.organizationId,
				entityType: "hr_employment_contract",
				entityId: contract.id,
				actorId: contract.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.contracts.delete(contract.id);
			return outbox;
		}

		return ok({ ...contract });
	}

	// Department methods
	async getDepartmentById(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}): Promise<Result<Department | null>> {
		const department = this.departments.get(input.departmentId);
		if (!department || department.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...department });
	}

	async findDepartmentByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Department | null>> {
		for (const department of this.departments.values()) {
			if (
				department.organizationId === input.organizationId &&
				department.code === input.code
			) {
				return ok({ ...department });
			}
		}
		return ok(null);
	}

	async createDepartment(
		record: DepartmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>> {
		const existing = await this.findDepartmentByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Department with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		if (record.parentDepartmentId !== null) {
			const parent = this.departments.get(record.parentDepartmentId);
			if (!parent || parent.organizationId !== record.organizationId) {
				return notFound(
					"Parent department not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeParent = assertActiveDepartment(parent.status);
			if (!activeParent.ok) {
				return activeParent;
			}
		}

		const idResult = parseHumanResourcesDepartmentId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const department: Department = {
			id: idResult.data,
			organizationId: record.organizationId,
			code: record.code,
			name: record.name,
			parentDepartmentId: record.parentDepartmentId,
			status: record.status,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.departments.set(department.id, department);

		const audit = await ports.audit.record({
			organizationId: department.organizationId,
			actorUserId: department.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_department",
			entityId: department.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.departments.delete(department.id);
			return audit;
		}

		return ok({ ...department });
	}

	async updateDepartment(
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			name?: string;
			parentDepartmentId?: HumanResourcesDepartmentId | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>> {
		const department = this.departments.get(input.departmentId);
		if (!department || department.organizationId !== input.organizationId) {
			return notFound("Department not found");
		}

		const versionCheck = assertExpectedVersion(
			department.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextName = input.name !== undefined ? input.name : department.name;
		const nextParent =
			input.parentDepartmentId !== undefined
				? input.parentDepartmentId
				: department.parentDepartmentId;

		if (nextParent !== null) {
			const parent = this.departments.get(nextParent);
			if (!parent || parent.organizationId !== input.organizationId) {
				return notFound(
					"Parent department not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeParent = assertActiveDepartment(parent.status);
			if (!activeParent.ok) {
				return activeParent;
			}
		}

		const cycleCheck = assertDepartmentParentAcyclic({
			departmentId: input.departmentId,
			proposedParentId: nextParent,
			getParentId: (id) => {
				const dept = this.departments.get(id);
				if (!dept || dept.organizationId !== input.organizationId) {
					return undefined;
				}
				return dept.parentDepartmentId;
			},
		});
		if (!cycleCheck.ok) {
			return cycleCheck;
		}

		const now = new Date();
		const updated: Department = {
			...department,
			name: nextName,
			parentDepartmentId: nextParent,
			version: department.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.departments.set(input.departmentId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_department",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.departments.set(input.departmentId, department);
			return audit;
		}

		return ok({ ...updated });
	}

	async setDepartmentStatus(
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			status: DepartmentStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>> {
		const department = this.departments.get(input.departmentId);
		if (!department || department.organizationId !== input.organizationId) {
			return notFound("Department not found");
		}

		const versionCheck = assertExpectedVersion(
			department.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertDepartmentStatusTransition(
			department.status,
			input.status,
		);
		if (!transition.ok) {
			return transition;
		}

		if (input.status === "archived") {
			const childCount = await this.countActiveChildDepartments({
				organizationId: input.organizationId,
				parentDepartmentId: input.departmentId,
			});
			if (!childCount.ok) {
				return childCount;
			}
			if (childCount.data > 0) {
				return conflict(
					"Cannot archive department with active child departments",
				);
			}

			const positionCount =
				await this.countActiveOrFrozenPositionsForDepartment({
					organizationId: input.organizationId,
					departmentId: input.departmentId,
				});
			if (!positionCount.ok) {
				return positionCount;
			}
			if (positionCount.data > 0) {
				return conflict(
					"Cannot archive department with active or frozen positions",
				);
			}
		}

		const now = new Date();
		const updated: Department = {
			...department,
			status: input.status,
			version: department.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.departments.set(input.departmentId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_department",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.departments.set(input.departmentId, department);
			return audit;
		}

		return ok({ ...updated });
	}

	async listDepartments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: DepartmentStatus;
		parentDepartmentId?: HumanResourcesDepartmentId | null;
	}): Promise<Result<{ departments: Department[]; totalCount: number }>> {
		let filtered = Array.from(this.departments.values()).filter(
			(d) => d.organizationId === input.organizationId,
		);

		if (input.status !== undefined) {
			filtered = filtered.filter((d) => d.status === input.status);
		}
		if (input.parentDepartmentId !== undefined) {
			filtered = filtered.filter(
				(d) => d.parentDepartmentId === input.parentDepartmentId,
			);
		}

		filtered.sort((a, b) => a.code.localeCompare(b.code));

		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const departments = filtered
			.slice(start, start + input.pageSize)
			.map((d) => ({ ...d }));

		return ok({ departments, totalCount });
	}

	async listAllDepartments(input: {
		organizationId: string;
	}): Promise<Result<Department[]>> {
		const departments = Array.from(this.departments.values())
			.filter((d) => d.organizationId === input.organizationId)
			.map((d) => ({ ...d }));
		departments.sort((a, b) => a.code.localeCompare(b.code));
		return ok(departments);
	}

	// Job methods
	async getJobById(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}): Promise<Result<Job | null>> {
		const job = this.jobs.get(input.jobId);
		if (!job || job.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...job });
	}

	async findJobByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Job | null>> {
		for (const job of this.jobs.values()) {
			if (
				job.organizationId === input.organizationId &&
				job.code === input.code
			) {
				return ok({ ...job });
			}
		}
		return ok(null);
	}

	async createJob(
		record: JobCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>> {
		const existing = await this.findJobByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Job with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const idResult = parseHumanResourcesJobId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const job: Job = {
			id: idResult.data,
			organizationId: record.organizationId,
			code: record.code,
			title: record.title,
			status: record.status,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.jobs.set(job.id, job);

		const audit = await ports.audit.record({
			organizationId: job.organizationId,
			actorUserId: job.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_job",
			entityId: job.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.jobs.delete(job.id);
			return audit;
		}

		return ok({ ...job });
	}

	async updateJob(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			title: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>> {
		const job = this.jobs.get(input.jobId);
		if (!job || job.organizationId !== input.organizationId) {
			return notFound("Job not found");
		}

		const versionCheck = assertExpectedVersion(
			job.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const now = new Date();
		const updated: Job = {
			...job,
			title: input.title,
			version: job.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.jobs.set(input.jobId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.jobs.set(input.jobId, job);
			return audit;
		}

		return ok({ ...updated });
	}

	async setJobStatus(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			status: JobStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>> {
		const job = this.jobs.get(input.jobId);
		if (!job || job.organizationId !== input.organizationId) {
			return notFound("Job not found");
		}

		const versionCheck = assertExpectedVersion(
			job.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertJobStatusTransition(job.status, input.status);
		if (!transition.ok) {
			return transition;
		}

		if (input.status === "archived") {
			const positionCount = await this.countActiveOrFrozenPositionsForJob({
				organizationId: input.organizationId,
				jobId: input.jobId,
			});
			if (!positionCount.ok) {
				return positionCount;
			}
			if (positionCount.data > 0) {
				return conflict("Cannot archive job with active or frozen positions");
			}
		}

		const now = new Date();
		const updated: Job = {
			...job,
			status: input.status,
			version: job.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.jobs.set(input.jobId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.jobs.set(input.jobId, job);
			return audit;
		}

		return ok({ ...updated });
	}

	async listJobs(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: JobStatus;
	}): Promise<Result<{ jobs: Job[]; totalCount: number }>> {
		let filtered = Array.from(this.jobs.values()).filter(
			(j) => j.organizationId === input.organizationId,
		);

		if (input.status !== undefined) {
			filtered = filtered.filter((j) => j.status === input.status);
		}

		filtered.sort((a, b) => a.code.localeCompare(b.code));

		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const jobs = filtered
			.slice(start, start + input.pageSize)
			.map((j) => ({ ...j }));

		return ok({ jobs, totalCount });
	}

	// Position methods
	async getPositionById(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<Position | null>> {
		const position = this.positions.get(input.positionId);
		if (!position || position.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...position });
	}

	async findPositionByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Position | null>> {
		for (const position of this.positions.values()) {
			if (
				position.organizationId === input.organizationId &&
				position.code === input.code
			) {
				return ok({ ...position });
			}
		}
		return ok(null);
	}

	async createPosition(
		record: PositionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>> {
		const parsedStatus = positionStatusSchema.safeParse(record.status);
		if (!parsedStatus.success) {
			return fail(
				"BAD_REQUEST",
				"Invalid position status",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}

		const department = this.departments.get(record.departmentId);
		if (!department || department.organizationId !== record.organizationId) {
			return notFound(
				"Department not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const activeDepartment = assertActiveDepartment(department.status);
		if (!activeDepartment.ok) {
			return activeDepartment;
		}

		const job = this.jobs.get(record.jobId);
		if (!job || job.organizationId !== record.organizationId) {
			return notFound(
				"Job not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const activeJob = assertActiveJob(job.status);
		if (!activeJob.ok) {
			return activeJob;
		}

		const existing = await this.findPositionByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Position with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const idResult = parseHumanResourcesPositionId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const position: Position = {
			id: idResult.data,
			organizationId: record.organizationId,
			code: record.code,
			title: record.title,
			departmentId: record.departmentId,
			jobId: record.jobId,
			status: parsedStatus.data,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.positions.set(position.id, position);

		const audit = await ports.audit.record({
			organizationId: position.organizationId,
			actorUserId: position.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_position",
			entityId: position.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.positions.delete(position.id);
			return audit;
		}

		return ok({ ...position });
	}

	async updatePosition(
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			title?: string;
			departmentId?: HumanResourcesDepartmentId;
			jobId?: HumanResourcesJobId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>> {
		const position = this.positions.get(input.positionId);
		if (!position || position.organizationId !== input.organizationId) {
			return notFound("Position not found");
		}

		const versionCheck = assertExpectedVersion(
			position.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextTitle = input.title !== undefined ? input.title : position.title;
		const nextDepartmentId =
			input.departmentId !== undefined
				? input.departmentId
				: position.departmentId;
		const nextJobId = input.jobId !== undefined ? input.jobId : position.jobId;

		if (nextDepartmentId === null || nextJobId === null) {
			return invalidInput("Position requires department and job");
		}

		if (input.departmentId !== undefined) {
			const department = this.departments.get(input.departmentId);
			if (!department || department.organizationId !== input.organizationId) {
				return notFound(
					"Department not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeDepartment = assertActiveDepartment(department.status);
			if (!activeDepartment.ok) {
				return activeDepartment;
			}
		}

		if (input.jobId !== undefined) {
			const job = this.jobs.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId) {
				return notFound(
					"Job not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeJob = assertActiveJob(job.status);
			if (!activeJob.ok) {
				return activeJob;
			}
		}

		const now = new Date();
		const updated: Position = {
			...position,
			title: nextTitle,
			departmentId: nextDepartmentId,
			jobId: nextJobId,
			version: position.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.positions.set(input.positionId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_position",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.positions.set(input.positionId, position);
			return audit;
		}

		return ok({ ...updated });
	}

	async setPositionStatus(
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			status: PositionStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>> {
		const position = this.positions.get(input.positionId);
		if (!position || position.organizationId !== input.organizationId) {
			return notFound("Position not found");
		}

		const versionCheck = assertExpectedVersion(
			position.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertPositionStatusTransition(
			position.status,
			input.status,
		);
		if (!transition.ok) {
			return transition;
		}

		if (input.status === "frozen" || input.status === "closed") {
			const openCount = await this.countOpenAssignmentsForPosition({
				organizationId: input.organizationId,
				positionId: input.positionId,
			});
			if (!openCount.ok) {
				return openCount;
			}
			if (openCount.data > 0) {
				return conflict(
					"Cannot freeze or close position with open assignments",
				);
			}
		}

		const now = new Date();
		const updated: Position = {
			...position,
			status: input.status,
			version: position.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.positions.set(input.positionId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_position",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.positions.set(input.positionId, position);
			return audit;
		}

		return ok({ ...updated });
	}

	async listPositions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: string;
		departmentId?: HumanResourcesDepartmentId;
		jobId?: HumanResourcesJobId;
	}): Promise<Result<{ positions: Position[]; totalCount: number }>> {
		let filtered = Array.from(this.positions.values()).filter(
			(p) => p.organizationId === input.organizationId,
		);

		if (input.status !== undefined) {
			filtered = filtered.filter((p) => p.status === input.status);
		}
		if (input.departmentId !== undefined) {
			filtered = filtered.filter((p) => p.departmentId === input.departmentId);
		}
		if (input.jobId !== undefined) {
			filtered = filtered.filter((p) => p.jobId === input.jobId);
		}

		filtered.sort((a, b) => a.title.localeCompare(b.title));

		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const positions = filtered
			.slice(start, start + input.pageSize)
			.map((p) => ({ ...p }));

		return ok({ positions, totalCount });
	}

	async countOpenAssignmentsForPosition(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<number>> {
		let count = 0;
		for (const assignment of this.assignments.values()) {
			if (
				assignment.organizationId === input.organizationId &&
				assignment.positionId === input.positionId &&
				assignment.endsOn === null
			) {
				count += 1;
			}
		}
		return ok(count);
	}

	async countActiveOrFrozenPositionsForDepartment(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}): Promise<Result<number>> {
		let count = 0;
		for (const position of this.positions.values()) {
			if (
				position.organizationId === input.organizationId &&
				position.departmentId === input.departmentId &&
				(position.status === "active" || position.status === "frozen")
			) {
				count += 1;
			}
		}
		return ok(count);
	}

	async countActiveOrFrozenPositionsForJob(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}): Promise<Result<number>> {
		let count = 0;
		for (const position of this.positions.values()) {
			if (
				position.organizationId === input.organizationId &&
				position.jobId === input.jobId &&
				(position.status === "active" || position.status === "frozen")
			) {
				count += 1;
			}
		}
		return ok(count);
	}

	async countActiveChildDepartments(input: {
		organizationId: string;
		parentDepartmentId: HumanResourcesDepartmentId;
	}): Promise<Result<number>> {
		let count = 0;
		for (const department of this.departments.values()) {
			if (
				department.organizationId === input.organizationId &&
				department.parentDepartmentId === input.parentDepartmentId &&
				department.status === "active"
			) {
				count += 1;
			}
		}
		return ok(count);
	}

	// Assignment methods
	async getAssignmentById(input: {
		organizationId: string;
		assignmentId: HumanResourcesAssignmentId;
	}): Promise<Result<WorkAssignment | null>> {
		const assignment = this.assignments.get(input.assignmentId);
		if (!assignment || assignment.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...assignment });
	}

	async findOpenAssignmentByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<WorkAssignment | null>> {
		for (const assignment of this.assignments.values()) {
			if (
				assignment.organizationId === input.organizationId &&
				assignment.employmentId === input.employmentId &&
				assignment.endsOn === null
			) {
				return ok({ ...assignment });
			}
		}
		return ok(null);
	}

	async createAssignment(
		record: AssignmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkAssignment>> {
		const employment = this.employments.get(record.employmentId);
		if (!employment || employment.organizationId !== record.organizationId) {
			return fail(
				"NOT_FOUND",
				"Employment not found",
				humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				),
			);
		}

		if (employment.employeeId !== record.employeeId) {
			return fail(
				"BAD_REQUEST",
				"Employee does not match employment",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}

		const position = this.positions.get(record.positionId);
		if (!position || position.organizationId !== record.organizationId) {
			return fail(
				"NOT_FOUND",
				"Position not found",
				humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				),
			);
		}

		const activeCheck = assertActivePosition(position.status);
		if (!activeCheck.ok) {
			return activeCheck;
		}

		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const existingOpen = await this.findOpenAssignmentByEmployment({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!existingOpen.ok) {
			return existingOpen;
		}
		if (existingOpen.data !== null) {
			return fail(
				"CONFLICT",
				"Employment already has an open assignment",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}

		const idResult = parseHumanResourcesAssignmentId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const assignment: WorkAssignment = {
			id: idResult.data,
			organizationId: record.organizationId,
			employmentId: record.employmentId,
			employeeId: record.employeeId,
			positionId: record.positionId,
			startsOn: record.startsOn,
			endsOn: record.endsOn,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.assignments.set(assignment.id, assignment);

		const audit = await ports.audit.record({
			organizationId: assignment.organizationId,
			actorUserId: assignment.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_work_assignment",
			entityId: assignment.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.assignments.delete(assignment.id);
			return audit;
		}

		return ok({ ...assignment });
	}

	async endAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesAssignmentId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkAssignment>> {
		const assignment = this.assignments.get(input.assignmentId);
		if (!assignment || assignment.organizationId !== input.organizationId) {
			return fail(
				"NOT_FOUND",
				"Assignment not found",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
			);
		}

		const versionCheck = assertExpectedVersion(
			assignment.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const dateCheck = assertValidDateRange(assignment.startsOn, input.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const now = new Date();
		const updated: WorkAssignment = {
			...assignment,
			endsOn: input.endsOn,
			version: assignment.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.assignments.set(input.assignmentId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_work_assignment",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.assignments.set(input.assignmentId, assignment);
			return audit;
		}

		return ok({ ...updated });
	}

	// Reporting line methods
	async getReportingLineById(input: {
		organizationId: string;
		reportingLineId: HumanResourcesReportingLineId;
	}): Promise<Result<ReportingLine | null>> {
		const line = this.reportingLines.get(input.reportingLineId);
		if (!line || line.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...line });
	}

	async listReportingLinesForEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ReportingLine[]>> {
		const lines = Array.from(this.reportingLines.values())
			.filter(
				(line) =>
					line.organizationId === input.organizationId &&
					line.employeeId === input.employeeId,
			)
			.map((line) => ({ ...line }));
		lines.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
		return ok(lines);
	}

	async findOpenPrimaryReportingLine(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ReportingLine | null>> {
		for (const line of this.reportingLines.values()) {
			if (
				line.organizationId === input.organizationId &&
				line.employeeId === input.employeeId &&
				line.relationshipKind === "primary" &&
				line.endsOn === null
			) {
				return ok({ ...line });
			}
		}
		return ok(null);
	}

	async resolvePrimaryManager(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}): Promise<Result<ReportingLine | null>> {
		for (const line of this.reportingLines.values()) {
			if (
				line.organizationId === input.organizationId &&
				line.employeeId === input.employeeId &&
				line.relationshipKind === "primary" &&
				line.startsOn <= input.asOf &&
				(line.endsOn === null || line.endsOn >= input.asOf)
			) {
				return ok({ ...line });
			}
		}
		return ok(null);
	}

	async listDirectReports(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		asOf: string;
		page: number;
		pageSize: number;
	}): Promise<Result<{ reportingLines: ReportingLine[]; totalCount: number }>> {
		const filtered = Array.from(this.reportingLines.values()).filter(
			(line) =>
				line.organizationId === input.organizationId &&
				line.managerEmployeeId === input.managerEmployeeId &&
				line.relationshipKind === "primary" &&
				line.startsOn <= input.asOf &&
				(line.endsOn === null || line.endsOn >= input.asOf),
		);

		filtered.sort((a, b) => a.startsOn.localeCompare(b.startsOn));

		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const reportingLines = filtered
			.slice(start, start + input.pageSize)
			.map((line) => ({ ...line }));

		return ok({ reportingLines, totalCount });
	}

	async assignPrimaryReportingLine(
		record: ReportingLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>> {
		const employee = this.employees.get(record.employeeId);
		if (!employee || employee.organizationId !== record.organizationId) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const manager = this.employees.get(record.managerEmployeeId);
		if (!manager || manager.organizationId !== record.organizationId) {
			return notFound(
				"Manager employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const openPrimary = await this.findOpenPrimaryReportingLine({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!openPrimary.ok) {
			return openPrimary;
		}
		if (openPrimary.data !== null) {
			return conflict("Employee already has an open primary reporting line");
		}

		const existingLines = await this.listReportingLinesForEmployee({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!existingLines.ok) {
			return existingLines;
		}

		const overlap = assertNoPrimaryReportingOverlap({
			candidateStartsOn: record.startsOn,
			candidateEndsOn: record.endsOn,
			existing: existingLines.data,
		});
		if (!overlap.ok) {
			return overlap;
		}

		const cycleCheck = assertReportingLineAcyclic({
			employeeId: record.employeeId,
			managerEmployeeId: record.managerEmployeeId,
			getOpenPrimaryManagerId: (employeeId) => {
				const emp = this.employees.get(employeeId);
				if (!emp || emp.organizationId !== record.organizationId) {
					return undefined;
				}
				for (const line of this.reportingLines.values()) {
					if (
						line.organizationId === record.organizationId &&
						line.employeeId === employeeId &&
						line.relationshipKind === "primary" &&
						line.endsOn === null
					) {
						return line.managerEmployeeId;
					}
				}
				return null;
			},
		});
		if (!cycleCheck.ok) {
			return cycleCheck;
		}

		const idResult = parseHumanResourcesReportingLineId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const reportingLine: ReportingLine = {
			id: idResult.data,
			organizationId: record.organizationId,
			employeeId: record.employeeId,
			managerEmployeeId: record.managerEmployeeId,
			relationshipKind: "primary",
			startsOn: record.startsOn,
			endsOn: record.endsOn,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.reportingLines.set(reportingLine.id, reportingLine);

		const audit = await ports.audit.record({
			organizationId: reportingLine.organizationId,
			actorUserId: reportingLine.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: reportingLine.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.reportingLines.delete(reportingLine.id);
			return audit;
		}

		return ok({ ...reportingLine });
	}

	async closeReportingLine(
		input: {
			organizationId: string;
			reportingLineId: HumanResourcesReportingLineId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>> {
		const line = this.reportingLines.get(input.reportingLineId);
		if (!line || line.organizationId !== input.organizationId) {
			return notFound("Reporting line not found");
		}

		const versionCheck = assertExpectedVersion(
			line.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		if (line.endsOn !== null) {
			return conflict("Reporting line is already closed");
		}

		const dateCheck = assertValidDateRange(line.startsOn, input.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const now = new Date();
		const updated: ReportingLine = {
			...line,
			endsOn: input.endsOn,
			version: line.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.reportingLines.set(input.reportingLineId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.reportingLines.set(input.reportingLineId, line);
			return audit;
		}

		return ok({ ...updated });
	}

	async replacePrimaryReportingLine(
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			managerEmployeeId: HumanResourcesEmployeeId;
			startsOn: string;
			endsOn: string | null;
			closePriorOn: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>> {
		const openPrimary = await this.findOpenPrimaryReportingLine({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!openPrimary.ok) {
			return openPrimary;
		}
		if (openPrimary.data === null) {
			return notFound("Open primary reporting line not found");
		}

		const prior = this.reportingLines.get(openPrimary.data.id);
		if (!prior || prior.organizationId !== input.organizationId) {
			return notFound("Open primary reporting line not found");
		}

		if (input.closePriorOn < prior.startsOn) {
			return invalidInput(
				"closePriorOn must be on or after the prior reporting line start date",
			);
		}

		const priorCloseDates = assertValidDateRange(
			prior.startsOn,
			input.closePriorOn,
		);
		if (!priorCloseDates.ok) {
			return priorCloseDates;
		}

		if (input.closePriorOn > input.startsOn) {
			return invalidInput(
				"closePriorOn must be on or before the new reporting line start date",
			);
		}

		const newDateCheck = assertValidDateRange(input.startsOn, input.endsOn);
		if (!newDateCheck.ok) {
			return newDateCheck;
		}

		const employee = this.employees.get(input.employeeId);
		if (!employee || employee.organizationId !== input.organizationId) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const manager = this.employees.get(input.managerEmployeeId);
		if (!manager || manager.organizationId !== input.organizationId) {
			return notFound(
				"Manager employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const existingLines = await this.listReportingLinesForEmployee({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!existingLines.ok) {
			return existingLines;
		}

		// Prior line is closed in this atomic replace; exclude it from overlap.
		const otherPrimaries = existingLines.data.filter(
			(line) => line.id !== prior.id,
		);
		const overlap = assertNoPrimaryReportingOverlap({
			candidateStartsOn: input.startsOn,
			candidateEndsOn: input.endsOn,
			existing: otherPrimaries,
		});
		if (!overlap.ok) {
			return overlap;
		}

		const cycleCheck = assertReportingLineAcyclic({
			employeeId: input.employeeId,
			managerEmployeeId: input.managerEmployeeId,
			getOpenPrimaryManagerId: (employeeId) => {
				const emp = this.employees.get(employeeId);
				if (!emp || emp.organizationId !== input.organizationId) {
					return undefined;
				}
				if (employeeId === input.employeeId) {
					return null;
				}
				for (const line of this.reportingLines.values()) {
					if (
						line.organizationId === input.organizationId &&
						line.employeeId === employeeId &&
						line.relationshipKind === "primary" &&
						line.endsOn === null
					) {
						return line.managerEmployeeId;
					}
				}
				return null;
			},
		});
		if (!cycleCheck.ok) {
			return cycleCheck;
		}

		const idResult = parseHumanResourcesReportingLineId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const closedPrior: ReportingLine = {
			...prior,
			endsOn: input.closePriorOn,
			version: prior.version + 1,
			updatedBy: input.createdBy,
			updatedAt: now,
		};
		const reportingLine: ReportingLine = {
			id: idResult.data,
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			managerEmployeeId: input.managerEmployeeId,
			relationshipKind: "primary",
			startsOn: input.startsOn,
			endsOn: input.endsOn,
			version: 1,
			createdBy: input.createdBy,
			updatedBy: input.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.reportingLines.set(prior.id, closedPrior);
		this.reportingLines.set(reportingLine.id, reportingLine);

		const closeAudit = await ports.audit.record({
			organizationId: closedPrior.organizationId,
			actorUserId: input.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: closedPrior.id,
			action: "UPDATE",
			changes: [],
		});
		if (!closeAudit.ok) {
			this.reportingLines.set(prior.id, prior);
			this.reportingLines.delete(reportingLine.id);
			return closeAudit;
		}

		const createAudit = await ports.audit.record({
			organizationId: reportingLine.organizationId,
			actorUserId: input.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: reportingLine.id,
			action: "CREATE",
			changes: [],
		});
		if (!createAudit.ok) {
			this.reportingLines.set(prior.id, prior);
			this.reportingLines.delete(reportingLine.id);
			return createAudit;
		}

		return ok({ ...reportingLine });
	}

	async getOrganizationTree(input: {
		organizationId: string;
		rootDepartmentId: HumanResourcesDepartmentId | null;
		maxDepth: number;
		maxNodes: number;
	}): Promise<Result<OrganizationTreePage>> {
		const departments = await this.listAllDepartments({
			organizationId: input.organizationId,
		});
		if (!departments.ok) {
			return departments;
		}

		const tree = buildBoundedDepartmentTree({
			departments: departments.data,
			rootDepartmentId: input.rootDepartmentId,
			maxDepth: input.maxDepth,
			maxNodes: input.maxNodes,
		});

		return ok({
			nodes: tree.nodes,
			truncated: tree.truncated,
		});
	}

	private assertRecruitmentOrgMatch(
		entity: { organizationId: string },
		organizationId: string,
		label: string,
	): Result<void> {
		if (entity.organizationId !== organizationId) {
			return notFound(`${label} not found`);
		}
		return ok(undefined);
	}

	private async validateRequisitionReferences(input: {
		organizationId: string;
		jobId: HumanResourcesJobId | null;
		positionId: HumanResourcesPositionId | null;
		departmentId: HumanResourcesDepartmentId | null;
	}): Promise<Result<void>> {
		if (input.jobId !== null) {
			const job = this.jobs.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId) {
				return notFound(
					"Job not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
		}
		if (input.positionId !== null) {
			const position = this.positions.get(input.positionId);
			if (!position || position.organizationId !== input.organizationId) {
				return notFound(
					"Position not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
		}
		if (input.departmentId !== null) {
			const department = this.departments.get(input.departmentId);
			if (!department || department.organizationId !== input.organizationId) {
				return notFound(
					"Department not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
		}
		return ok(undefined);
	}

	// Requisition methods
	async findRequisitionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentRequisitionRecord | null>> {
		const record = this.requisitionIdempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			requisition: cloneRequisition(record.requisition),
			createRequestFingerprint: record.createRequestFingerprint,
		});
	}

	async getRequisitionById(input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<JobRequisition | null>> {
		const requisition = this.requisitions.get(input.requisitionId);
		if (requisition === undefined) {
			return ok(null);
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			requisition,
			input.organizationId,
			"Requisition",
		);
		if (!orgCheck.ok) {
			return notFound("Requisition not found");
		}
		return ok(cloneRequisition(requisition));
	}

	async findRequisitionByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<JobRequisition | null>> {
		for (const requisition of this.requisitions.values()) {
			if (
				requisition.organizationId === input.organizationId &&
				requisition.code === input.code
			) {
				return ok(cloneRequisition(requisition));
			}
		}
		return ok(null);
	}

	async createDraftRequisition(
		record: RequisitionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobRequisition>> {
		const existingByKey = await this.findRequisitionByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			return ok(cloneRequisition(existingByKey.data.requisition));
		}

		const existingByCode = await this.findRequisitionByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existingByCode.ok) {
			return existingByCode;
		}
		if (existingByCode.data !== null) {
			return fail(
				"CONFLICT",
				"Requisition with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const refs = await this.validateRequisitionReferences({
			organizationId: record.organizationId,
			jobId: record.jobId,
			positionId: record.positionId,
			departmentId: record.departmentId,
		});
		if (!refs.ok) {
			return refs;
		}

		const idResult = parseHumanResourcesRequisitionId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const requisition: JobRequisition = {
			id: idResult.data,
			organizationId: record.organizationId,
			code: record.code,
			title: record.title,
			status: "draft",
			jobId: record.jobId,
			positionId: record.positionId,
			departmentId: record.departmentId,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.requisitions.set(requisition.id, requisition);
		this.requisitionIdempotencyByKey.set(
			this.idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			),
			{
				requisition: cloneRequisition(requisition),
				createRequestFingerprint: record.createRequestFingerprint,
			},
		);

		const audit = await ports.audit.record({
			organizationId: requisition.organizationId,
			actorUserId: requisition.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_job_requisition",
			entityId: requisition.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.requisitions.delete(requisition.id);
			this.requisitionIdempotencyByKey.delete(
				this.idempotencyMapKey(
					record.organizationId,
					record.createIdempotencyKey,
				),
			);
			return audit;
		}

		return ok(cloneRequisition(requisition));
	}

	async amendRequisition(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			title?: string;
			jobId?: HumanResourcesJobId | null;
			positionId?: HumanResourcesPositionId | null;
			departmentId?: HumanResourcesDepartmentId | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobRequisition>> {
		const requisition = this.requisitions.get(input.requisitionId);
		if (requisition === undefined) {
			return notFound("Requisition not found");
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			requisition,
			input.organizationId,
			"Requisition",
		);
		if (!orgCheck.ok) {
			return notFound("Requisition not found");
		}

		const versionCheck = assertExpectedVersion(
			requisition.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const amendable = assertRequisitionAmendable(requisition.status);
		if (!amendable.ok) {
			return amendable;
		}

		const nextTitle =
			input.title !== undefined ? input.title : requisition.title;
		const nextJobId =
			input.jobId !== undefined ? input.jobId : requisition.jobId;
		const nextPositionId =
			input.positionId !== undefined
				? input.positionId
				: requisition.positionId;
		const nextDepartmentId =
			input.departmentId !== undefined
				? input.departmentId
				: requisition.departmentId;

		const refs = await this.validateRequisitionReferences({
			organizationId: input.organizationId,
			jobId: nextJobId,
			positionId: nextPositionId,
			departmentId: nextDepartmentId,
		});
		if (!refs.ok) {
			return refs;
		}

		const now = new Date();
		const updated: JobRequisition = {
			...requisition,
			title: nextTitle,
			jobId: nextJobId,
			positionId: nextPositionId,
			departmentId: nextDepartmentId,
			version: requisition.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.requisitions.set(input.requisitionId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job_requisition",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.requisitions.set(input.requisitionId, requisition);
			return audit;
		}

		return ok(cloneRequisition(updated));
	}

	async transitionRequisitionStatus(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			status: RequisitionStatus;
			expectedVersion: number;
			actorUserId: string;
			emitApprovedEvent?: boolean;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobRequisition>> {
		const requisition = this.requisitions.get(input.requisitionId);
		if (requisition === undefined) {
			return notFound("Requisition not found");
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			requisition,
			input.organizationId,
			"Requisition",
		);
		if (!orgCheck.ok) {
			return notFound("Requisition not found");
		}

		const versionCheck = assertExpectedVersion(
			requisition.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertRequisitionStatusTransition(
			requisition.status,
			input.status,
		);
		if (!transition.ok) {
			return transition;
		}

		const now = new Date();
		const updated: JobRequisition = {
			...requisition,
			status: input.status,
			version: requisition.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.requisitions.set(input.requisitionId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job_requisition",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.requisitions.set(input.requisitionId, requisition);
			return audit;
		}

		const shouldEmitApproved =
			input.status === "approved" && input.emitApprovedEvent === true;
		if (shouldEmitApproved) {
			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_job_requisition",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				this.requisitions.set(input.requisitionId, requisition);
				return outbox;
			}
		}

		return ok(cloneRequisition(updated));
	}

	async listRequisitions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: RequisitionStatus;
	}): Promise<Result<RequisitionListPage>> {
		let filtered = Array.from(this.requisitions.values()).filter(
			(r) => r.organizationId === input.organizationId,
		);
		if (input.status !== undefined) {
			filtered = filtered.filter((r) => r.status === input.status);
		}
		filtered.sort((a, b) => a.code.localeCompare(b.code));
		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const requisitions = filtered
			.slice(start, start + input.pageSize)
			.map((r) => cloneRequisition(r));
		return ok({
			requisitions,
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// Candidate methods
	async findCandidateByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCandidateRecord | null>> {
		const record = this.candidateIdempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			candidate: cloneCandidate(record.candidate),
			createRequestFingerprint: record.createRequestFingerprint,
		});
	}

	async getCandidateById(input: {
		organizationId: string;
		candidateId: HumanResourcesCandidateId;
	}): Promise<Result<Candidate | null>> {
		const candidate = this.candidates.get(input.candidateId);
		if (candidate === undefined) {
			return ok(null);
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			candidate,
			input.organizationId,
			"Candidate",
		);
		if (!orgCheck.ok) {
			return notFound("Candidate not found");
		}
		return ok(cloneCandidate(candidate));
	}

	async findCandidateByNormalizedEmail(input: {
		organizationId: string;
		normalizedEmail: string;
	}): Promise<Result<Candidate | null>> {
		const candidateId = this.candidateByNormalizedEmail.get(
			`${input.organizationId}:${input.normalizedEmail}`,
		);
		if (candidateId === undefined) {
			return ok(null);
		}
		const candidate = this.candidates.get(candidateId);
		if (candidate === undefined) {
			return ok(null);
		}
		return ok(cloneCandidate(candidate));
	}

	async createCandidate(
		record: CandidateCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Candidate>> {
		const existingByKey = await this.findCandidateByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			return ok(cloneCandidate(existingByKey.data.candidate));
		}

		const existingByEmail = await this.findCandidateByNormalizedEmail({
			organizationId: record.organizationId,
			normalizedEmail: record.normalizedEmail,
		});
		if (!existingByEmail.ok) {
			return existingByEmail;
		}
		if (existingByEmail.data !== null) {
			return fail(
				"CONFLICT",
				"Candidate with this email already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const idResult = parseHumanResourcesCandidateId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const candidate: Candidate = {
			id: idResult.data,
			organizationId: record.organizationId,
			displayName: record.displayName,
			email: record.email,
			phone: record.phone,
			status: "active",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.candidates.set(candidate.id, candidate);
		this.candidateByNormalizedEmail.set(
			`${record.organizationId}:${record.normalizedEmail}`,
			candidate.id,
		);
		this.candidateIdempotencyByKey.set(
			this.idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			),
			{
				candidate: cloneCandidate(candidate),
				createRequestFingerprint: record.createRequestFingerprint,
			},
		);

		const audit = await ports.audit.record({
			organizationId: candidate.organizationId,
			actorUserId: candidate.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_candidate",
			entityId: candidate.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.candidates.delete(candidate.id);
			this.candidateByNormalizedEmail.delete(
				`${record.organizationId}:${record.normalizedEmail}`,
			);
			this.candidateIdempotencyByKey.delete(
				this.idempotencyMapKey(
					record.organizationId,
					record.createIdempotencyKey,
				),
			);
			return audit;
		}

		return ok(cloneCandidate(candidate));
	}

	async updateCandidateProfile(
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			displayName?: string;
			phone?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Candidate>> {
		const candidate = this.candidates.get(input.candidateId);
		if (candidate === undefined) {
			return notFound("Candidate not found");
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			candidate,
			input.organizationId,
			"Candidate",
		);
		if (!orgCheck.ok) {
			return orgCheck;
		}

		const versionCheck = assertExpectedVersion(
			candidate.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const now = new Date();
		const updated: Candidate = {
			...candidate,
			displayName:
				input.displayName !== undefined
					? input.displayName
					: candidate.displayName,
			phone: input.phone !== undefined ? input.phone : candidate.phone,
			version: candidate.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.candidates.set(input.candidateId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_candidate",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.candidates.set(input.candidateId, candidate);
			return audit;
		}

		return ok(cloneCandidate(updated));
	}

	async listCandidates(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CandidateStatus;
	}): Promise<Result<CandidateListPage>> {
		let filtered = Array.from(this.candidates.values()).filter(
			(c) => c.organizationId === input.organizationId,
		);
		if (input.status !== undefined) {
			filtered = filtered.filter((c) => c.status === input.status);
		}
		filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const candidates = filtered
			.slice(start, start + input.pageSize)
			.map((c) => cloneCandidate(c));
		return ok({
			candidates,
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// Application methods
	async getApplicationById(input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}): Promise<Result<CandidateApplication | null>> {
		const application = this.applications.get(input.applicationId);
		if (application === undefined) {
			return ok(null);
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			application,
			input.organizationId,
			"Application",
		);
		if (!orgCheck.ok) {
			return notFound("Application not found");
		}
		return ok(cloneApplication(application));
	}

	async findActiveApplicationByCandidateRequisition(input: {
		organizationId: string;
		candidateId: HumanResourcesCandidateId;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<CandidateApplication | null>> {
		for (const application of this.applications.values()) {
			if (
				application.organizationId === input.organizationId &&
				application.candidateId === input.candidateId &&
				application.requisitionId === input.requisitionId &&
				!isApplicationTerminal(application.status)
			) {
				return ok(cloneApplication(application));
			}
		}
		return ok(null);
	}

	async createApplication(
		record: ApplicationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CandidateApplication>> {
		const candidate = this.candidates.get(record.candidateId);
		if (candidate === undefined) {
			return notFound("Candidate not found");
		}
		const candidateOrg = this.assertRecruitmentOrgMatch(
			candidate,
			record.organizationId,
			"Candidate",
		);
		if (!candidateOrg.ok) {
			return candidateOrg;
		}

		const activeCandidate = assertCandidateActive(candidate.status);
		if (!activeCandidate.ok) {
			return activeCandidate;
		}

		const requisition = this.requisitions.get(record.requisitionId);
		if (requisition === undefined) {
			return notFound("Requisition not found");
		}
		const requisitionOrg = this.assertRecruitmentOrgMatch(
			requisition,
			record.organizationId,
			"Requisition",
		);
		if (!requisitionOrg.ok) {
			return requisitionOrg;
		}

		const openRequisition = assertRequisitionOpenForApplication(
			requisition.status,
		);
		if (!openRequisition.ok) {
			return openRequisition;
		}

		const existingActive =
			await this.findActiveApplicationByCandidateRequisition({
				organizationId: record.organizationId,
				candidateId: record.candidateId,
				requisitionId: record.requisitionId,
			});
		if (!existingActive.ok) {
			return existingActive;
		}
		if (existingActive.data !== null) {
			return conflict(
				"An active application already exists for this candidate and requisition",
			);
		}

		const idResult = parseHumanResourcesApplicationId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const application: CandidateApplication = {
			id: idResult.data,
			organizationId: record.organizationId,
			candidateId: record.candidateId,
			requisitionId: record.requisitionId,
			status: "submitted",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.applications.set(application.id, application);

		const audit = await ports.audit.record({
			organizationId: application.organizationId,
			actorUserId: application.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_candidate_application",
			entityId: application.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.applications.delete(application.id);
			return audit;
		}

		return ok(cloneApplication(application));
	}

	async transitionApplicationStatus(
		input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
			status: ApplicationStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CandidateApplication>> {
		const application = this.applications.get(input.applicationId);
		if (application === undefined) {
			return notFound("Application not found");
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			application,
			input.organizationId,
			"Application",
		);
		if (!orgCheck.ok) {
			return orgCheck;
		}

		const versionCheck = assertExpectedVersion(
			application.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertApplicationStatusTransition(
			application.status,
			input.status,
		);
		if (!transition.ok) {
			return transition;
		}

		const now = new Date();
		const updated: CandidateApplication = {
			...application,
			status: input.status,
			version: application.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.applications.set(input.applicationId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_candidate_application",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.applications.set(input.applicationId, application);
			return audit;
		}

		return ok(cloneApplication(updated));
	}

	async listApplications(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: ApplicationStatus;
		candidateId?: HumanResourcesCandidateId;
		requisitionId?: HumanResourcesRequisitionId;
	}): Promise<Result<ApplicationListPage>> {
		let filtered = Array.from(this.applications.values()).filter(
			(a) => a.organizationId === input.organizationId,
		);
		if (input.status !== undefined) {
			filtered = filtered.filter((a) => a.status === input.status);
		}
		if (input.candidateId !== undefined) {
			filtered = filtered.filter((a) => a.candidateId === input.candidateId);
		}
		if (input.requisitionId !== undefined) {
			filtered = filtered.filter(
				(a) => a.requisitionId === input.requisitionId,
			);
		}
		filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const applications = filtered
			.slice(start, start + input.pageSize)
			.map((a) => cloneApplication(a));
		return ok({
			applications,
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// Interview methods
	async getInterviewById(input: {
		organizationId: string;
		interviewId: HumanResourcesInterviewId;
	}): Promise<Result<Interview | null>> {
		const interview = this.interviews.get(input.interviewId);
		if (interview === undefined) {
			return ok(null);
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			interview,
			input.organizationId,
			"Interview",
		);
		if (!orgCheck.ok) {
			return notFound("Interview not found");
		}
		return ok(cloneInterview(interview));
	}

	async scheduleInterview(
		record: InterviewScheduleRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Interview>> {
		const application = this.applications.get(record.applicationId);
		if (application === undefined) {
			return notFound("Application not found");
		}
		const applicationOrg = this.assertRecruitmentOrgMatch(
			application,
			record.organizationId,
			"Application",
		);
		if (!applicationOrg.ok) {
			return applicationOrg;
		}

		const schedulable = assertInterviewSchedulable(application.status);
		if (!schedulable.ok) {
			return schedulable;
		}

		const idResult = parseHumanResourcesInterviewId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const interview: Interview = {
			id: idResult.data,
			organizationId: record.organizationId,
			applicationId: record.applicationId,
			scheduledAt: new Date(record.scheduledAt),
			status: "scheduled",
			interviewerActorId: record.interviewerActorId,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.interviews.set(interview.id, interview);

		const audit = await ports.audit.record({
			organizationId: interview.organizationId,
			actorUserId: interview.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_interview",
			entityId: interview.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.interviews.delete(interview.id);
			return audit;
		}

		return ok(cloneInterview(interview));
	}

	async cancelInterview(
		input: {
			organizationId: string;
			interviewId: HumanResourcesInterviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Interview>> {
		const interview = this.interviews.get(input.interviewId);
		if (interview === undefined) {
			return notFound("Interview not found");
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			interview,
			input.organizationId,
			"Interview",
		);
		if (!orgCheck.ok) {
			return orgCheck;
		}

		const versionCheck = assertExpectedVersion(
			interview.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertInterviewStatusTransition(
			interview.status,
			"cancelled",
		);
		if (!transition.ok) {
			return transition;
		}

		const now = new Date();
		const updated: Interview = {
			...interview,
			status: "cancelled",
			version: interview.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.interviews.set(input.interviewId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_interview",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.interviews.set(input.interviewId, interview);
			return audit;
		}

		return ok(cloneInterview(updated));
	}

	async listInterviews(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		applicationId?: HumanResourcesApplicationId;
	}): Promise<Result<InterviewListPage>> {
		let filtered = Array.from(this.interviews.values()).filter(
			(i) => i.organizationId === input.organizationId,
		);
		if (input.applicationId !== undefined) {
			filtered = filtered.filter(
				(i) => i.applicationId === input.applicationId,
			);
		}
		filtered.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const interviews = filtered
			.slice(start, start + input.pageSize)
			.map((i) => cloneInterview(i));
		return ok({
			interviews,
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// Interview evaluation methods
	async getInterviewEvaluationByInterviewId(input: {
		organizationId: string;
		interviewId: HumanResourcesInterviewId;
	}): Promise<Result<InterviewEvaluation | null>> {
		const evaluationId = this.interviewEvaluationByInterviewId.get(
			input.interviewId,
		);
		if (evaluationId === undefined) {
			return ok(null);
		}
		const evaluation = this.interviewEvaluations.get(evaluationId);
		if (evaluation === undefined) {
			return ok(null);
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			evaluation,
			input.organizationId,
			"Interview evaluation",
		);
		if (!orgCheck.ok) {
			return notFound("Interview evaluation not found");
		}
		return ok(cloneEvaluation(evaluation));
	}

	async recordInterviewEvaluation(
		record: InterviewEvaluationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<InterviewEvaluation>> {
		const interview = this.interviews.get(record.interviewId);
		if (interview === undefined) {
			return notFound("Interview not found");
		}
		const interviewOrg = this.assertRecruitmentOrgMatch(
			interview,
			record.organizationId,
			"Interview",
		);
		if (!interviewOrg.ok) {
			return interviewOrg;
		}

		const existingEvaluation = this.interviewEvaluationByInterviewId.get(
			record.interviewId,
		);
		if (existingEvaluation !== undefined) {
			return conflict("Interview evaluation already recorded");
		}

		const versionCheck = assertExpectedVersion(
			interview.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const completeTransition = assertInterviewStatusTransition(
			interview.status,
			"completed",
		);
		if (!completeTransition.ok) {
			return completeTransition;
		}

		const evaluationIdResult = parseHumanResourcesInterviewEvaluationId(
			randomUUID(),
		);
		if (!evaluationIdResult.ok) {
			return evaluationIdResult;
		}

		const now = new Date();
		const completedInterview: Interview = {
			...interview,
			status: "completed",
			version: interview.version + 1,
			updatedBy: record.createdBy,
			updatedAt: now,
		};

		const evaluation: InterviewEvaluation = {
			id: evaluationIdResult.data,
			organizationId: record.organizationId,
			interviewId: record.interviewId,
			result: record.result,
			privateNotes: record.privateNotes,
			evaluatorActorId: record.evaluatorActorId,
			recordedAt: now,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.interviews.set(record.interviewId, completedInterview);
		this.interviewEvaluations.set(evaluation.id, evaluation);
		this.interviewEvaluationByInterviewId.set(
			record.interviewId,
			evaluation.id,
		);

		const interviewAudit = await ports.audit.record({
			organizationId: completedInterview.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_interview",
			entityId: completedInterview.id,
			action: "UPDATE",
			changes: [],
		});
		if (!interviewAudit.ok) {
			this.interviews.set(record.interviewId, interview);
			this.interviewEvaluations.delete(evaluation.id);
			this.interviewEvaluationByInterviewId.delete(record.interviewId);
			return interviewAudit;
		}

		const evaluationAudit = await ports.audit.record({
			organizationId: evaluation.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_interview_evaluation",
			entityId: evaluation.id,
			action: "CREATE",
			changes: [],
		});
		if (!evaluationAudit.ok) {
			this.interviews.set(record.interviewId, interview);
			this.interviewEvaluations.delete(evaluation.id);
			this.interviewEvaluationByInterviewId.delete(record.interviewId);
			return evaluationAudit;
		}

		return ok(cloneEvaluation(evaluation));
	}

	// Offer methods
	async getOfferById(input: {
		organizationId: string;
		offerId: HumanResourcesOfferId;
	}): Promise<Result<EmploymentOffer | null>> {
		const offer = this.offers.get(input.offerId);
		if (offer === undefined) {
			return ok(null);
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			offer,
			input.organizationId,
			"Offer",
		);
		if (!orgCheck.ok) {
			return notFound("Offer not found");
		}
		return ok(cloneOffer(offer));
	}

	async findActiveOfferByApplication(input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}): Promise<Result<EmploymentOffer | null>> {
		for (const offer of this.offers.values()) {
			if (
				offer.organizationId === input.organizationId &&
				offer.applicationId === input.applicationId &&
				isOfferActive(offer.status)
			) {
				return ok(cloneOffer(offer));
			}
		}
		return ok(null);
	}

	async findOfferByAcceptIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOfferAcceptRecord | null>> {
		const record = this.offerAcceptIdempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			handoff: cloneHandoff(record.handoff),
			acceptRequestFingerprint: record.acceptRequestFingerprint,
		});
	}

	async createOffer(
		record: OfferCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentOffer>> {
		const application = this.applications.get(record.applicationId);
		if (application === undefined) {
			return notFound("Application not found");
		}
		const applicationOrg = this.assertRecruitmentOrgMatch(
			application,
			record.organizationId,
			"Application",
		);
		if (!applicationOrg.ok) {
			return applicationOrg;
		}

		const eligible = assertApplicationEligibleForOffer(application.status);
		if (!eligible.ok) {
			return eligible;
		}

		const existingActive = await this.findActiveOfferByApplication({
			organizationId: record.organizationId,
			applicationId: record.applicationId,
		});
		if (!existingActive.ok) {
			return existingActive;
		}
		if (existingActive.data !== null) {
			return conflict("An active offer already exists for this application");
		}

		const idResult = parseHumanResourcesOfferId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const offer: EmploymentOffer = {
			id: idResult.data,
			organizationId: record.organizationId,
			applicationId: record.applicationId,
			status: "draft",
			termsSummary: record.termsSummary,
			expiresOn: record.expiresOn,
			issuedAt: null,
			respondedAt: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.offers.set(offer.id, offer);

		const audit = await ports.audit.record({
			organizationId: offer.organizationId,
			actorUserId: offer.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employment_offer",
			entityId: offer.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.offers.delete(offer.id);
			return audit;
		}

		return ok(cloneOffer(offer));
	}

	async amendOfferDraft(
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			termsSummary?: string;
			expiresOn?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentOffer>> {
		const offer = this.offers.get(input.offerId);
		if (offer === undefined) {
			return notFound("Offer not found");
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			offer,
			input.organizationId,
			"Offer",
		);
		if (!orgCheck.ok) {
			return orgCheck;
		}

		const versionCheck = assertExpectedVersion(
			offer.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const amendable = assertOfferAmendable(offer.status);
		if (!amendable.ok) {
			return amendable;
		}

		const now = new Date();
		const updated: EmploymentOffer = {
			...offer,
			termsSummary:
				input.termsSummary !== undefined
					? input.termsSummary
					: offer.termsSummary,
			expiresOn:
				input.expiresOn !== undefined ? input.expiresOn : offer.expiresOn,
			version: offer.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.offers.set(input.offerId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employment_offer",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.offers.set(input.offerId, offer);
			return audit;
		}

		return ok(cloneOffer(updated));
	}

	async transitionOfferStatus(
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			status: OfferStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentOffer>> {
		const offer = this.offers.get(input.offerId);
		if (offer === undefined) {
			return notFound("Offer not found");
		}
		const orgCheck = this.assertRecruitmentOrgMatch(
			offer,
			input.organizationId,
			"Offer",
		);
		if (!orgCheck.ok) {
			return orgCheck;
		}

		const versionCheck = assertExpectedVersion(
			offer.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertOfferStatusTransition(offer.status, input.status);
		if (!transition.ok) {
			return transition;
		}

		const application = this.applications.get(offer.applicationId);
		if (application === undefined) {
			return notFound("Application not found");
		}
		const applicationOrg = this.assertRecruitmentOrgMatch(
			application,
			input.organizationId,
			"Application",
		);
		if (!applicationOrg.ok) {
			return applicationOrg;
		}

		let updatedApplication: CandidateApplication | null = null;
		if (input.status === "issued") {
			const applicationTransition = assertApplicationStatusTransition(
				application.status,
				"offered",
			);
			if (!applicationTransition.ok) {
				return applicationTransition;
			}
			const nowForApp = new Date();
			updatedApplication = {
				...application,
				status: "offered",
				version: application.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: nowForApp,
			};
		}

		const now = new Date();
		const updated: EmploymentOffer = {
			...offer,
			status: input.status,
			issuedAt: input.status === "issued" ? now : offer.issuedAt,
			respondedAt:
				input.status === "declined" ||
				input.status === "expired" ||
				input.status === "withdrawn"
					? now
					: offer.respondedAt,
			version: offer.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.offers.set(input.offerId, updated);
		if (updatedApplication !== null) {
			this.applications.set(application.id, updatedApplication);
		}

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employment_offer",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.offers.set(input.offerId, offer);
			if (updatedApplication !== null) {
				this.applications.set(application.id, application);
			}
			return audit;
		}

		if (updatedApplication !== null) {
			const applicationAudit = await ports.audit.record({
				organizationId: updatedApplication.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_candidate_application",
				entityId: updatedApplication.id,
				action: "UPDATE",
				changes: [],
			});
			if (!applicationAudit.ok) {
				this.offers.set(input.offerId, offer);
				this.applications.set(application.id, application);
				return applicationAudit;
			}
		}

		return ok(cloneOffer(updated));
	}

	async acceptOffer(
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			idempotencyKey: string;
			acceptRequestFingerprint: string;
			expectedVersion: number;
			actorUserId: string;
			asOfDate: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OfferAcceptanceHandoff>> {
		const existingByKey = await this.findOfferByAcceptIdempotencyKey({
			organizationId: input.organizationId,
			idempotencyKey: input.idempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			return ok(cloneHandoff(existingByKey.data.handoff));
		}

		const offer = this.offers.get(input.offerId);
		if (offer === undefined) {
			return notFound("Offer not found");
		}
		const offerOrg = this.assertRecruitmentOrgMatch(
			offer,
			input.organizationId,
			"Offer",
		);
		if (!offerOrg.ok) {
			return offerOrg;
		}

		const versionCheck = assertExpectedVersion(
			offer.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const acceptable = assertOfferAcceptable({
			status: offer.status,
			expiresOn: offer.expiresOn,
			asOfDate: input.asOfDate,
		});
		if (!acceptable.ok) {
			return acceptable;
		}

		const application = this.applications.get(offer.applicationId);
		if (application === undefined) {
			return notFound("Application not found");
		}
		const applicationOrg = this.assertRecruitmentOrgMatch(
			application,
			input.organizationId,
			"Application",
		);
		if (!applicationOrg.ok) {
			return applicationOrg;
		}

		const applicationTransition = assertApplicationStatusTransition(
			application.status,
			"accepted",
		);
		if (!applicationTransition.ok) {
			return applicationTransition;
		}

		const candidate = this.candidates.get(application.candidateId);
		if (candidate === undefined) {
			return notFound("Candidate not found");
		}
		const candidateOrg = this.assertRecruitmentOrgMatch(
			candidate,
			input.organizationId,
			"Candidate",
		);
		if (!candidateOrg.ok) {
			return candidateOrg;
		}

		const requisition = this.requisitions.get(application.requisitionId);
		if (requisition === undefined) {
			return notFound("Requisition not found");
		}
		const requisitionOrg = this.assertRecruitmentOrgMatch(
			requisition,
			input.organizationId,
			"Requisition",
		);
		if (!requisitionOrg.ok) {
			return requisitionOrg;
		}

		const now = new Date();
		const updatedOffer: EmploymentOffer = {
			...offer,
			status: "accepted",
			respondedAt: now,
			version: offer.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		const updatedApplication: CandidateApplication = {
			...application,
			status: "accepted",
			version: application.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.offers.set(input.offerId, updatedOffer);
		this.applications.set(application.id, updatedApplication);

		const handoff: OfferAcceptanceHandoff = {
			organizationId: input.organizationId,
			offerId: updatedOffer.id,
			applicationId: application.id,
			candidateId: application.candidateId,
			requisitionId: application.requisitionId,
			correlationId: meta.correlationId,
			acceptedAt: now,
			offer: cloneOffer(updatedOffer),
		};

		const offerAudit = await ports.audit.record({
			organizationId: updatedOffer.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employment_offer",
			entityId: updatedOffer.id,
			action: "UPDATE",
			changes: [],
		});
		if (!offerAudit.ok) {
			this.offers.set(input.offerId, offer);
			this.applications.set(application.id, application);
			return offerAudit;
		}

		const applicationAudit = await ports.audit.record({
			organizationId: updatedApplication.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_candidate_application",
			entityId: updatedApplication.id,
			action: "UPDATE",
			changes: [],
		});
		if (!applicationAudit.ok) {
			this.offers.set(input.offerId, offer);
			this.applications.set(application.id, application);
			return applicationAudit;
		}

		const outbox = await ports.outbox.append({
			organizationId: updatedOffer.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
			payload: {
				organizationId: updatedOffer.organizationId,
				entityType: "hr_employment_offer",
				entityId: updatedOffer.id,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.offers.set(input.offerId, offer);
			this.applications.set(application.id, application);
			return outbox;
		}

		this.offerAcceptIdempotencyByKey.set(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
			{
				handoff: cloneHandoff(handoff),
				acceptRequestFingerprint: input.acceptRequestFingerprint,
			},
		);

		return ok(cloneHandoff(handoff));
	}

	async listOffers(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: OfferStatus;
		applicationId?: HumanResourcesApplicationId;
	}): Promise<Result<OfferListPage>> {
		let filtered = Array.from(this.offers.values()).filter(
			(o) => o.organizationId === input.organizationId,
		);
		if (input.status !== undefined) {
			filtered = filtered.filter((o) => o.status === input.status);
		}
		if (input.applicationId !== undefined) {
			filtered = filtered.filter(
				(o) => o.applicationId === input.applicationId,
			);
		}
		filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const offers = filtered
			.slice(start, start + input.pageSize)
			.map((o) => cloneOffer(o));
		return ok({
			offers,
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// --- Lifecycle: onboarding ---

	async getOnboardingCase(input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}): Promise<Result<OnboardingCase | null>> {
		const row = this.onboardingCases.get(input.onboardingCaseId);
		if (!row || row.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(cloneOnboardingCase(row));
	}

	async findOnboardingByStartIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOnboardingCaseRecord | null>> {
		const record = this.onboardingIdempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			onboardingCase: cloneOnboardingCase(record.onboardingCase),
			startRequestFingerprint: record.startRequestFingerprint,
		});
	}

	async startOnboarding(
		record: OnboardingCaseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OnboardingCase>> {
		const existingByKey = await this.findOnboardingByStartIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			if (
				existingByKey.data.startRequestFingerprint !==
				record.startRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(cloneOnboardingCase(existingByKey.data.onboardingCase));
		}

		const employment = this.employments.get(record.employmentId);
		if (!employment || employment.organizationId !== record.organizationId) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const activeCheck = assertEmploymentActiveForOnboarding(employment.status);
		if (!activeCheck.ok) {
			return activeCheck;
		}

		if (record.sourceOfferId !== null) {
			const offer = this.offers.get(record.sourceOfferId);
			if (!offer || offer.organizationId !== record.organizationId) {
				return notFound(
					"Offer not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
		}

		for (const existing of this.onboardingCases.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.employmentId === record.employmentId &&
				existing.status === "in_progress"
			) {
				return conflict(
					"Employment already has an in-progress onboarding case",
				);
			}
		}

		const caseIdResult = parseHumanResourcesOnboardingCaseId(randomUUID());
		if (!caseIdResult.ok) {
			return caseIdResult;
		}

		const now = new Date();
		const onboardingCase: OnboardingCase = {
			id: caseIdResult.data,
			organizationId: record.organizationId,
			employmentId: record.employmentId,
			employeeId: employment.employeeId,
			status: "in_progress",
			sourceOfferId: record.sourceOfferId,
			startedAt: now,
			completedAt: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		const seededTasks: OnboardingTask[] = [];
		for (const seed of record.tasks) {
			const taskIdResult = parseHumanResourcesOnboardingTaskId(randomUUID());
			if (!taskIdResult.ok) {
				return taskIdResult;
			}
			seededTasks.push({
				id: taskIdResult.data,
				organizationId: record.organizationId,
				caseId: onboardingCase.id,
				code: seed.code.trim(),
				title: seed.title.trim(),
				mandatory: seed.mandatory,
				status: "pending",
				completedAt: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			});
		}

		this.onboardingCases.set(onboardingCase.id, onboardingCase);
		for (const task of seededTasks) {
			this.onboardingTasks.set(task.id, task);
		}
		const idemKey = this.idempotencyMapKey(
			record.organizationId,
			record.idempotencyKey,
		);
		this.onboardingIdempotencyByKey.set(idemKey, {
			onboardingCase: cloneOnboardingCase(onboardingCase),
			startRequestFingerprint: record.startRequestFingerprint,
		});

		const audit = await ports.audit.record({
			organizationId: onboardingCase.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_onboarding_case",
			entityId: onboardingCase.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.onboardingCases.delete(onboardingCase.id);
			for (const task of seededTasks) {
				this.onboardingTasks.delete(task.id);
			}
			this.onboardingIdempotencyByKey.delete(idemKey);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: onboardingCase.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
			payload: {
				organizationId: onboardingCase.organizationId,
				entityType: "hr_onboarding_case",
				entityId: onboardingCase.id,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.onboardingCases.delete(onboardingCase.id);
			for (const task of seededTasks) {
				this.onboardingTasks.delete(task.id);
			}
			this.onboardingIdempotencyByKey.delete(idemKey);
			return outbox;
		}

		return ok(cloneOnboardingCase(onboardingCase));
	}

	async completeOnboardingTask(
		input: {
			organizationId: string;
			taskId: HumanResourcesOnboardingTaskId;
			newStatus: LifecycleTaskStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OnboardingCase>> {
		const task = this.onboardingTasks.get(input.taskId);
		if (!task || task.organizationId !== input.organizationId) {
			return notFound("Onboarding task not found");
		}
		const onboardingCase = this.onboardingCases.get(task.caseId);
		if (
			!onboardingCase ||
			onboardingCase.organizationId !== input.organizationId
		) {
			return notFound("Onboarding case not found");
		}
		const caseActive = assertOnboardingCaseInProgress(onboardingCase.status);
		if (!caseActive.ok) {
			return caseActive;
		}
		const versionCheck = assertExpectedVersion(
			task.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertLifecycleTaskStatusTransition(
			task.status,
			input.newStatus,
		);
		if (!transition.ok) {
			return transition;
		}

		const now = new Date();
		const previousTask = { ...task };
		const updatedTask: OnboardingTask = {
			...task,
			status: input.newStatus,
			completedAt: now,
			version: task.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.onboardingTasks.set(task.id, updatedTask);

		const audit = await ports.audit.record({
			organizationId: updatedTask.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_onboarding_task",
			entityId: updatedTask.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.onboardingTasks.set(task.id, previousTask);
			return audit;
		}

		return ok(cloneOnboardingCase(onboardingCase));
	}

	async completeOnboarding(
		input: {
			organizationId: string;
			onboardingCaseId: HumanResourcesOnboardingCaseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OnboardingCase>> {
		const onboardingCase = this.onboardingCases.get(input.onboardingCaseId);
		if (
			!onboardingCase ||
			onboardingCase.organizationId !== input.organizationId
		) {
			return notFound("Onboarding case not found");
		}
		const caseActive = assertOnboardingCaseInProgress(onboardingCase.status);
		if (!caseActive.ok) {
			return caseActive;
		}
		const versionCheck = assertExpectedVersion(
			onboardingCase.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const tasks = Array.from(this.onboardingTasks.values()).filter(
			(task) =>
				task.organizationId === input.organizationId &&
				task.caseId === onboardingCase.id,
		);
		const mandatoryIncomplete = tasks.some(
			(task) =>
				task.mandatory &&
				task.status !== "completed" &&
				task.status !== "waived",
		);
		if (mandatoryIncomplete) {
			return invalidState("All mandatory tasks must be completed or waived");
		}

		const now = new Date();
		const previous = { ...onboardingCase };
		const updated: OnboardingCase = {
			...onboardingCase,
			status: "completed",
			completedAt: now,
			version: onboardingCase.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.onboardingCases.set(updated.id, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_onboarding_case",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.onboardingCases.set(updated.id, previous);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
			payload: {
				organizationId: updated.organizationId,
				entityType: "hr_onboarding_case",
				entityId: updated.id,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.onboardingCases.set(updated.id, previous);
			return outbox;
		}

		return ok(cloneOnboardingCase(updated));
	}

	// --- Lifecycle: probation ---

	async getProbationReview(input: {
		organizationId: string;
		probationReviewId: HumanResourcesProbationReviewId;
	}): Promise<Result<ProbationReview | null>> {
		const row = this.probationReviews.get(input.probationReviewId);
		if (!row || row.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(cloneProbationReview(row));
	}

	async findProbationByOpenIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentProbationReviewRecord | null>> {
		const record = this.probationIdempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			probationReview: cloneProbationReview(record.probationReview),
			openRequestFingerprint: record.openRequestFingerprint,
		});
	}

	async openProbation(
		record: ProbationReviewCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ProbationReview>> {
		const existingByKey = await this.findProbationByOpenIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			if (
				existingByKey.data.openRequestFingerprint !==
				record.openRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(cloneProbationReview(existingByKey.data.probationReview));
		}

		const employment = this.employments.get(record.employmentId);
		if (!employment || employment.organizationId !== record.organizationId) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		if (employment.status !== "active") {
			return invalidState("Employment must be active to open probation");
		}
		const dateCheck = assertProbationDateRange({
			startsOn: record.startsOn,
			endsOn: record.endsOn,
		});
		if (!dateCheck.ok) {
			return dateCheck;
		}

		for (const existing of this.probationReviews.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.employmentId === record.employmentId &&
				existing.status === "open"
			) {
				return conflict("Employment already has an open probation review");
			}
		}

		const idResult = parseHumanResourcesProbationReviewId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}
		const now = new Date();
		const probation: ProbationReview = {
			id: idResult.data,
			organizationId: record.organizationId,
			employmentId: record.employmentId,
			employeeId: employment.employeeId,
			status: "open",
			startsOn: record.startsOn,
			endsOn: record.endsOn,
			outcome: null,
			outcomeActorId: null,
			outcomeRecordedOn: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.probationReviews.set(probation.id, probation);
		const idemKey = this.idempotencyMapKey(
			record.organizationId,
			record.idempotencyKey,
		);
		this.probationIdempotencyByKey.set(idemKey, {
			probationReview: cloneProbationReview(probation),
			openRequestFingerprint: record.openRequestFingerprint,
		});

		const audit = await ports.audit.record({
			organizationId: probation.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_probation_review",
			entityId: probation.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.probationReviews.delete(probation.id);
			this.probationIdempotencyByKey.delete(idemKey);
			return audit;
		}

		return ok(cloneProbationReview(probation));
	}

	async extendProbation(
		input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
			newEndsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ProbationReview>> {
		const probation = this.probationReviews.get(input.probationReviewId);
		if (!probation || probation.organizationId !== input.organizationId) {
			return notFound("Probation review not found");
		}
		const openCheck = assertProbationOpen(probation.status);
		if (!openCheck.ok) {
			return openCheck;
		}
		const versionCheck = assertExpectedVersion(
			probation.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const extension = assertProbationExtension({
			currentEndsOn: probation.endsOn,
			newEndsOn: input.newEndsOn,
		});
		if (!extension.ok) {
			return extension;
		}

		const now = new Date();
		const previous = { ...probation };
		const updated: ProbationReview = {
			...probation,
			endsOn: input.newEndsOn,
			version: probation.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.probationReviews.set(updated.id, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_probation_review",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.probationReviews.set(updated.id, previous);
			return audit;
		}

		return ok(cloneProbationReview(updated));
	}

	async recordProbationOutcome(
		input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
			outcome: ProbationOutcome;
			concludedOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ProbationReview>> {
		const probation = this.probationReviews.get(input.probationReviewId);
		if (!probation || probation.organizationId !== input.organizationId) {
			return notFound("Probation review not found");
		}
		const openCheck = assertProbationOpen(probation.status);
		if (!openCheck.ok) {
			return openCheck;
		}
		const versionCheck = assertExpectedVersion(
			probation.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const now = new Date();
		const previous = { ...probation };
		const updated: ProbationReview = {
			...probation,
			status: "closed",
			outcome: input.outcome,
			outcomeActorId: input.actorUserId,
			outcomeRecordedOn: input.concludedOn,
			version: probation.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.probationReviews.set(updated.id, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_probation_review",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.probationReviews.set(updated.id, previous);
			return audit;
		}

		return ok(cloneProbationReview(updated));
	}

	// --- Lifecycle: confirmation ---

	async getEmploymentConfirmation(input: {
		organizationId: string;
		employmentConfirmationId: HumanResourcesEmploymentConfirmationId;
	}): Promise<Result<EmploymentConfirmation | null>> {
		const row = this.employmentConfirmations.get(
			input.employmentConfirmationId,
		);
		if (!row || row.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(cloneEmploymentConfirmation(row));
	}

	async findConfirmationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmploymentConfirmationRecord | null>> {
		const record = this.confirmationIdempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			employmentConfirmation: cloneEmploymentConfirmation(
				record.employmentConfirmation,
			),
			confirmRequestFingerprint: record.confirmRequestFingerprint,
		});
	}

	async confirmEmployment(
		record: EmploymentConfirmationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentConfirmation>> {
		const existingByKey = await this.findConfirmationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			if (
				existingByKey.data.confirmRequestFingerprint !==
				record.confirmRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(
				cloneEmploymentConfirmation(existingByKey.data.employmentConfirmation),
			);
		}

		const employment = this.employments.get(record.employmentId);
		if (!employment || employment.organizationId !== record.organizationId) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		for (const existing of this.employmentConfirmations.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.employmentId === record.employmentId
			) {
				return conflict("Employment already has a confirmation");
			}
		}

		const probationRows = Array.from(this.probationReviews.values())
			.filter(
				(row) =>
					row.organizationId === record.organizationId &&
					row.employmentId === record.employmentId,
			)
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		const hasAnyProbation = probationRows.length > 0;
		const latestClosed =
			probationRows.find((row) => row.status === "closed") ?? null;
		const probationGate = assertLatestProbationPassed({
			hasAnyProbation,
			latestClosedProbation: latestClosed,
		});
		if (!probationGate.ok) {
			return probationGate;
		}

		const idResult = parseHumanResourcesEmploymentConfirmationId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}
		const now = new Date();
		const confirmation: EmploymentConfirmation = {
			id: idResult.data,
			organizationId: record.organizationId,
			employmentId: record.employmentId,
			employeeId: employment.employeeId,
			confirmedOn: record.confirmedOn,
			confirmedBy: record.createdBy,
			evidenceNote: record.evidenceNote,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.employmentConfirmations.set(confirmation.id, confirmation);
		const idemKey = this.idempotencyMapKey(
			record.organizationId,
			record.idempotencyKey,
		);
		this.confirmationIdempotencyByKey.set(idemKey, {
			employmentConfirmation: cloneEmploymentConfirmation(confirmation),
			confirmRequestFingerprint: record.confirmRequestFingerprint,
		});

		const audit = await ports.audit.record({
			organizationId: confirmation.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employment_confirmation",
			entityId: confirmation.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.employmentConfirmations.delete(confirmation.id);
			this.confirmationIdempotencyByKey.delete(idemKey);
			return audit;
		}

		return ok(cloneEmploymentConfirmation(confirmation));
	}

	// --- Lifecycle: transfer ---

	async findTransferByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmploymentMovementRecord | null>> {
		const record = this.transferIdempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			employmentMovement: cloneEmploymentMovement(record.employmentMovement),
			transferRequestFingerprint: record.transferRequestFingerprint,
		});
	}

	async transferAssignment(
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			toPositionId: HumanResourcesPositionId;
			effectiveOn: string;
			reason: string;
			idempotencyKey: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentMovement>> {
		const openAssignment = await this.findOpenAssignmentByEmployment({
			organizationId: input.organizationId,
			employmentId: input.employmentId,
		});
		if (!openAssignment.ok) {
			return openAssignment;
		}
		if (openAssignment.data === null) {
			return notFound("Open assignment not found");
		}

		const fingerprint = fingerprintTransfer({
			employmentId: input.employmentId,
			fromPositionId: openAssignment.data.positionId,
			toPositionId: input.toPositionId,
			effectiveOn: input.effectiveOn,
		});

		const existingByKey = await this.findTransferByIdempotencyKey({
			organizationId: input.organizationId,
			idempotencyKey: input.idempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			if (existingByKey.data.transferRequestFingerprint !== fingerprint) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(cloneEmploymentMovement(existingByKey.data.employmentMovement));
		}

		const employment = this.employments.get(input.employmentId);
		if (!employment || employment.organizationId !== input.organizationId) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const toPosition = this.positions.get(input.toPositionId);
		if (!toPosition || toPosition.organizationId !== input.organizationId) {
			return notFound(
				"Position not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const activeCheck = assertActivePosition(toPosition.status);
		if (!activeCheck.ok) {
			return activeCheck;
		}
		if (toPosition.id === openAssignment.data.positionId) {
			return conflict("Target position must differ from current position");
		}

		const dateCheck = assertValidDateRange(
			openAssignment.data.startsOn,
			input.effectiveOn,
		);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const newAssignmentIdResult = parseHumanResourcesAssignmentId(randomUUID());
		if (!newAssignmentIdResult.ok) {
			return newAssignmentIdResult;
		}
		const movementIdResult = parseHumanResourcesEmploymentMovementId(
			randomUUID(),
		);
		if (!movementIdResult.ok) {
			return movementIdResult;
		}

		const now = new Date();
		const previousAssignment = { ...openAssignment.data };
		const endedAssignment: WorkAssignment = {
			...openAssignment.data,
			endsOn: input.effectiveOn,
			version: openAssignment.data.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		const newAssignment: WorkAssignment = {
			id: newAssignmentIdResult.data,
			organizationId: input.organizationId,
			employmentId: input.employmentId,
			employeeId: employment.employeeId,
			positionId: input.toPositionId,
			startsOn: input.effectiveOn,
			endsOn: null,
			version: 1,
			createdBy: input.actorUserId,
			updatedBy: input.actorUserId,
			createdAt: now,
			updatedAt: now,
		};
		const movement: EmploymentMovement = {
			id: movementIdResult.data,
			organizationId: input.organizationId,
			employmentId: input.employmentId,
			employeeId: employment.employeeId,
			movementKind: "transfer",
			fromAssignmentId: endedAssignment.id,
			toAssignmentId: newAssignment.id,
			fromPositionId: endedAssignment.positionId,
			toPositionId: input.toPositionId,
			effectiveOn: input.effectiveOn,
			reason: input.reason.trim(),
			version: 1,
			createdBy: input.actorUserId,
			updatedBy: input.actorUserId,
			createdAt: now,
			updatedAt: now,
		};

		this.assignments.set(endedAssignment.id, endedAssignment);
		this.assignments.set(newAssignment.id, newAssignment);
		this.employmentMovements.set(movement.id, movement);
		const idemKey = this.idempotencyMapKey(
			input.organizationId,
			input.idempotencyKey,
		);
		this.transferIdempotencyByKey.set(idemKey, {
			employmentMovement: cloneEmploymentMovement(movement),
			transferRequestFingerprint: fingerprint,
		});

		const audit = await ports.audit.record({
			organizationId: movement.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employment_movement",
			entityId: movement.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.assignments.set(endedAssignment.id, previousAssignment);
			this.assignments.delete(newAssignment.id);
			this.employmentMovements.delete(movement.id);
			this.transferIdempotencyByKey.delete(idemKey);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: movement.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
			payload: {
				organizationId: movement.organizationId,
				entityType: "hr_employee",
				entityId: employment.employeeId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.assignments.set(endedAssignment.id, previousAssignment);
			this.assignments.delete(newAssignment.id);
			this.employmentMovements.delete(movement.id);
			this.transferIdempotencyByKey.delete(idemKey);
			return outbox;
		}

		return ok(cloneEmploymentMovement(movement));
	}

	// --- Lifecycle: termination ---

	async getTermination(input: {
		organizationId: string;
		terminationId: HumanResourcesTerminationId;
	}): Promise<Result<Termination | null>> {
		const row = this.terminations.get(input.terminationId);
		if (!row || row.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(cloneTermination(row));
	}

	async findTerminationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentTerminationRecord | null>> {
		const record = this.terminationIdempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			termination: cloneTermination(record.termination),
			terminationRequestFingerprint: record.terminationRequestFingerprint,
		});
	}

	async finalizeTermination(
		record: TerminationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Termination>> {
		const existingByKey = await this.findTerminationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			if (
				existingByKey.data.terminationRequestFingerprint !==
				record.terminationRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(cloneTermination(existingByKey.data.termination));
		}

		const employment = this.employments.get(record.employmentId);
		if (!employment || employment.organizationId !== record.organizationId) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const effectiveCheck = assertTerminationEffectiveDate({
			effectiveOn: record.effectiveOn,
			employmentStartsOn: employment.startsOn,
		});
		if (!effectiveCheck.ok) {
			return effectiveCheck;
		}

		for (const existing of this.terminations.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.employmentId === record.employmentId &&
				existing.status === "finalized"
			) {
				return conflict("Employment already has a finalized termination");
			}
		}

		const idResult = parseHumanResourcesTerminationId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}
		const now = new Date();
		const termination: Termination = {
			id: idResult.data,
			organizationId: record.organizationId,
			employmentId: record.employmentId,
			employeeId: employment.employeeId,
			status: "finalized",
			reasonCode: record.reasonCode,
			reasonDetail: record.reasonDetail,
			effectiveOn: record.effectiveOn,
			finalizedAt: now,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const previousEmployment = { ...employment };
		const updatedEmployment: Employment = {
			...employment,
			status: "terminated",
			endsOn: record.effectiveOn,
			version: employment.version + 1,
			updatedBy: record.createdBy,
			updatedAt: now,
		};

		this.terminations.set(termination.id, termination);
		this.employments.set(employment.id, updatedEmployment);
		const idemKey = this.idempotencyMapKey(
			record.organizationId,
			record.idempotencyKey,
		);
		this.terminationIdempotencyByKey.set(idemKey, {
			termination: cloneTermination(termination),
			terminationRequestFingerprint: record.terminationRequestFingerprint,
		});

		const audit = await ports.audit.record({
			organizationId: termination.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_termination",
			entityId: termination.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.terminations.delete(termination.id);
			this.employments.set(employment.id, previousEmployment);
			this.terminationIdempotencyByKey.delete(idemKey);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: termination.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
			payload: {
				organizationId: termination.organizationId,
				entityType: "hr_employee",
				entityId: employment.employeeId,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.terminations.delete(termination.id);
			this.employments.set(employment.id, previousEmployment);
			this.terminationIdempotencyByKey.delete(idemKey);
			return outbox;
		}

		return ok(cloneTermination(termination));
	}

	// --- Lifecycle: offboarding ---

	async getOffboardingCase(input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}): Promise<Result<OffboardingCase | null>> {
		const row = this.offboardingCases.get(input.offboardingCaseId);
		if (!row || row.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(cloneOffboardingCase(row));
	}

	async findOffboardingByStartIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOffboardingCaseRecord | null>> {
		const record = this.offboardingIdempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			offboardingCase: cloneOffboardingCase(record.offboardingCase),
			startRequestFingerprint: record.startRequestFingerprint,
		});
	}

	async startOffboarding(
		record: OffboardingCaseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>> {
		const existingByKey = await this.findOffboardingByStartIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existingByKey.ok) {
			return existingByKey;
		}
		if (existingByKey.data !== null) {
			if (
				existingByKey.data.startRequestFingerprint !==
				record.startRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(cloneOffboardingCase(existingByKey.data.offboardingCase));
		}

		const employment = this.employments.get(record.employmentId);
		if (!employment || employment.organizationId !== record.organizationId) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		let hasFinalizedTermination = false;
		if (record.terminationId !== null) {
			const termination = this.terminations.get(record.terminationId);
			if (
				!termination ||
				termination.organizationId !== record.organizationId ||
				termination.employmentId !== record.employmentId
			) {
				return notFound(
					"Termination not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (termination.status !== "finalized") {
				return invalidState("Linked termination must be finalized");
			}
			hasFinalizedTermination = true;
		} else {
			hasFinalizedTermination = Array.from(this.terminations.values()).some(
				(row) =>
					row.organizationId === record.organizationId &&
					row.employmentId === record.employmentId &&
					row.status === "finalized",
			);
		}

		const eligibility = assertEmploymentForOffboarding({
			employmentStatus: employment.status,
			hasTermination: hasFinalizedTermination,
		});
		if (!eligibility.ok) {
			return eligibility;
		}

		for (const existing of this.offboardingCases.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.employmentId === record.employmentId &&
				existing.status === "in_progress"
			) {
				return conflict(
					"Employment already has an in-progress offboarding case",
				);
			}
		}

		const caseIdResult = parseHumanResourcesOffboardingCaseId(randomUUID());
		if (!caseIdResult.ok) {
			return caseIdResult;
		}
		const clearanceIdResult = parseHumanResourcesClearanceId(randomUUID());
		if (!clearanceIdResult.ok) {
			return clearanceIdResult;
		}

		const now = new Date();
		const offboardingCase: OffboardingCase = {
			id: caseIdResult.data,
			organizationId: record.organizationId,
			employmentId: record.employmentId,
			employeeId: employment.employeeId,
			terminationId: record.terminationId,
			status: "in_progress",
			startedAt: now,
			completedAt: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		const seededTasks: OffboardingTask[] = [];
		for (const seed of record.tasks) {
			const taskIdResult = parseHumanResourcesOffboardingTaskId(randomUUID());
			if (!taskIdResult.ok) {
				return taskIdResult;
			}
			seededTasks.push({
				id: taskIdResult.data,
				organizationId: record.organizationId,
				caseId: offboardingCase.id,
				code: seed.code.trim(),
				title: seed.title.trim(),
				mandatory: seed.mandatory,
				status: "pending",
				completedAt: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			});
		}

		const clearance: Clearance = {
			id: clearanceIdResult.data,
			organizationId: record.organizationId,
			offboardingCaseId: offboardingCase.id,
			employmentId: record.employmentId,
			status: "pending",
			clearedOn: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.offboardingCases.set(offboardingCase.id, offboardingCase);
		for (const task of seededTasks) {
			this.offboardingTasks.set(task.id, task);
		}
		this.clearances.set(clearance.id, clearance);
		const idemKey = this.idempotencyMapKey(
			record.organizationId,
			record.idempotencyKey,
		);
		this.offboardingIdempotencyByKey.set(idemKey, {
			offboardingCase: cloneOffboardingCase(offboardingCase),
			startRequestFingerprint: record.startRequestFingerprint,
		});

		const audit = await ports.audit.record({
			organizationId: offboardingCase.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_offboarding_case",
			entityId: offboardingCase.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.offboardingCases.delete(offboardingCase.id);
			for (const task of seededTasks) {
				this.offboardingTasks.delete(task.id);
			}
			this.clearances.delete(clearance.id);
			this.offboardingIdempotencyByKey.delete(idemKey);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: offboardingCase.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
			payload: {
				organizationId: offboardingCase.organizationId,
				entityType: "hr_offboarding_case",
				entityId: offboardingCase.id,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.offboardingCases.delete(offboardingCase.id);
			for (const task of seededTasks) {
				this.offboardingTasks.delete(task.id);
			}
			this.clearances.delete(clearance.id);
			this.offboardingIdempotencyByKey.delete(idemKey);
			return outbox;
		}

		return ok(cloneOffboardingCase(offboardingCase));
	}

	async completeOffboardingTask(
		input: {
			organizationId: string;
			taskId: HumanResourcesOffboardingTaskId;
			newStatus: LifecycleTaskStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>> {
		const task = this.offboardingTasks.get(input.taskId);
		if (!task || task.organizationId !== input.organizationId) {
			return notFound("Offboarding task not found");
		}
		const offboardingCase = this.offboardingCases.get(task.caseId);
		if (
			!offboardingCase ||
			offboardingCase.organizationId !== input.organizationId
		) {
			return notFound("Offboarding case not found");
		}
		const caseActive = assertOffboardingCaseInProgress(offboardingCase.status);
		if (!caseActive.ok) {
			return caseActive;
		}
		const versionCheck = assertExpectedVersion(
			task.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertLifecycleTaskStatusTransition(
			task.status,
			input.newStatus,
		);
		if (!transition.ok) {
			return transition;
		}

		const now = new Date();
		const previousTask = { ...task };
		const updatedTask: OffboardingTask = {
			...task,
			status: input.newStatus,
			completedAt: now,
			version: task.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.offboardingTasks.set(task.id, updatedTask);

		const audit = await ports.audit.record({
			organizationId: updatedTask.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_offboarding_task",
			entityId: updatedTask.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.offboardingTasks.set(task.id, previousTask);
			return audit;
		}

		return ok(cloneOffboardingCase(offboardingCase));
	}

	async recordExitInterview(
		input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
			conductedOn: string;
			notes: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>> {
		const offboardingCase = this.offboardingCases.get(input.offboardingCaseId);
		if (
			!offboardingCase ||
			offboardingCase.organizationId !== input.organizationId
		) {
			return notFound("Offboarding case not found");
		}
		const caseActive = assertOffboardingCaseInProgress(offboardingCase.status);
		if (!caseActive.ok) {
			return caseActive;
		}
		for (const existing of this.exitInterviews.values()) {
			if (
				existing.organizationId === input.organizationId &&
				existing.offboardingCaseId === offboardingCase.id
			) {
				return conflict("Exit interview already recorded for this case");
			}
		}
		if (input.notes === null || input.notes.trim().length === 0) {
			return invalidInput("Exit interview notes are required");
		}

		const idResult = parseHumanResourcesExitInterviewId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}
		const now = new Date();
		const interview: ExitInterview = {
			id: idResult.data,
			organizationId: input.organizationId,
			offboardingCaseId: offboardingCase.id,
			employmentId: offboardingCase.employmentId,
			conductedOn: input.conductedOn,
			notes: input.notes.trim(),
			version: 1,
			createdBy: input.actorUserId,
			updatedBy: input.actorUserId,
			createdAt: now,
			updatedAt: now,
		};
		this.exitInterviews.set(interview.id, interview);

		const audit = await ports.audit.record({
			organizationId: interview.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_exit_interview",
			entityId: interview.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.exitInterviews.delete(interview.id);
			return audit;
		}

		return ok(cloneOffboardingCase(offboardingCase));
	}

	async recordClearance(
		input: {
			organizationId: string;
			clearanceId: HumanResourcesClearanceId;
			clearedOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>> {
		const clearance = this.clearances.get(input.clearanceId);
		if (!clearance || clearance.organizationId !== input.organizationId) {
			return notFound("Clearance not found");
		}
		const offboardingCase = this.offboardingCases.get(
			clearance.offboardingCaseId,
		);
		if (
			!offboardingCase ||
			offboardingCase.organizationId !== input.organizationId
		) {
			return notFound("Offboarding case not found");
		}
		const caseActive = assertOffboardingCaseInProgress(offboardingCase.status);
		if (!caseActive.ok) {
			return caseActive;
		}
		const versionCheck = assertExpectedVersion(
			clearance.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertClearanceStatusTransition(
			clearance.status,
			"cleared",
		);
		if (!transition.ok) {
			return transition;
		}

		const now = new Date();
		const previous = { ...clearance };
		const updated: Clearance = {
			...clearance,
			status: "cleared",
			clearedOn: input.clearedOn,
			version: clearance.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.clearances.set(updated.id, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_clearance",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.clearances.set(updated.id, previous);
			return audit;
		}

		return ok(cloneOffboardingCase(offboardingCase));
	}

	async completeOffboarding(
		input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>> {
		const offboardingCase = this.offboardingCases.get(input.offboardingCaseId);
		if (
			!offboardingCase ||
			offboardingCase.organizationId !== input.organizationId
		) {
			return notFound("Offboarding case not found");
		}
		const caseActive = assertOffboardingCaseInProgress(offboardingCase.status);
		if (!caseActive.ok) {
			return caseActive;
		}
		const versionCheck = assertExpectedVersion(
			offboardingCase.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const tasks = Array.from(this.offboardingTasks.values()).filter(
			(task) =>
				task.organizationId === input.organizationId &&
				task.caseId === offboardingCase.id,
		);
		const mandatoryTasksComplete = tasks.every(
			(task) =>
				!task.mandatory ||
				task.status === "completed" ||
				task.status === "waived",
		);
		const hasExitInterview = Array.from(this.exitInterviews.values()).some(
			(row) =>
				row.organizationId === input.organizationId &&
				row.offboardingCaseId === offboardingCase.id,
		);
		const clearance =
			Array.from(this.clearances.values()).find(
				(row) =>
					row.organizationId === input.organizationId &&
					row.offboardingCaseId === offboardingCase.id,
			) ?? null;
		const ready = assertOffboardingReadyToComplete({
			mandatoryTasksComplete,
			hasExitInterview,
			clearanceStatus: clearance?.status ?? null,
		});
		if (!ready.ok) {
			return ready;
		}

		const now = new Date();
		const previous = { ...offboardingCase };
		const updated: OffboardingCase = {
			...offboardingCase,
			status: "completed",
			completedAt: now,
			version: offboardingCase.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.offboardingCases.set(updated.id, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_offboarding_case",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.offboardingCases.set(updated.id, previous);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
			payload: {
				organizationId: updated.organizationId,
				entityType: "hr_offboarding_case",
				entityId: updated.id,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.offboardingCases.set(updated.id, previous);
			return outbox;
		}

		return ok(cloneOffboardingCase(updated));
	}

	async listOnboardingTasks(input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}): Promise<Result<OnboardingTask[]>> {
		const onboardingCase = this.onboardingCases.get(input.onboardingCaseId);
		if (
			!onboardingCase ||
			onboardingCase.organizationId !== input.organizationId
		) {
			return notFound("Onboarding case not found");
		}
		const tasks = Array.from(this.onboardingTasks.values())
			.filter(
				(task) =>
					task.organizationId === input.organizationId &&
					task.caseId === input.onboardingCaseId,
			)
			.map((task) => ({ ...task }));
		tasks.sort((a, b) => a.code.localeCompare(b.code));
		return ok(tasks);
	}

	async listOffboardingTasks(input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}): Promise<Result<OffboardingTask[]>> {
		const offboardingCase = this.offboardingCases.get(input.offboardingCaseId);
		if (
			!offboardingCase ||
			offboardingCase.organizationId !== input.organizationId
		) {
			return notFound("Offboarding case not found");
		}
		const tasks = Array.from(this.offboardingTasks.values())
			.filter(
				(task) =>
					task.organizationId === input.organizationId &&
					task.caseId === input.offboardingCaseId,
			)
			.map((task) => ({ ...task }));
		tasks.sort((a, b) => a.code.localeCompare(b.code));
		return ok(tasks);
	}

	async getClearanceByOffboardingCase(input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}): Promise<Result<Clearance | null>> {
		const offboardingCase = this.offboardingCases.get(input.offboardingCaseId);
		if (
			!offboardingCase ||
			offboardingCase.organizationId !== input.organizationId
		) {
			return notFound("Offboarding case not found");
		}
		const clearance =
			Array.from(this.clearances.values()).find(
				(row) =>
					row.organizationId === input.organizationId &&
					row.offboardingCaseId === input.offboardingCaseId,
			) ?? null;
		return ok(clearance === null ? null : { ...clearance });
	}

	// Compensation Grade
	async getCompensationGrade(input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
	}): Promise<Result<CompensationGrade | null>> {
		const grade = this.compensationGrades.get(input.gradeId);
		if (!grade || grade.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...grade });
	}

	async findCompensationGradeByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<CompensationGrade | null>> {
		const grade =
			Array.from(this.compensationGrades.values()).find(
				(g) =>
					g.organizationId === input.organizationId && g.code === input.code,
			) ?? null;
		return ok(grade === null ? null : { ...grade });
	}

	async createCompensationGrade(
		record: {
			organizationId: string;
			code: string;
			name: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationGrade>> {
		const existing = Array.from(this.compensationGrades.values()).find(
			(g) =>
				g.organizationId === record.organizationId && g.code === record.code,
		);
		if (existing) {
			return conflict("Compensation grade code already exists");
		}

		const idResult = parseHumanResourcesCompensationGradeId(randomUUID());
		if (!idResult.ok) return idResult;
		const id = idResult.data;

		const now = new Date();
		const grade: CompensationGrade = {
			id,
			organizationId: record.organizationId,
			code: record.code,
			name: record.name,
			status: "active",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		this.compensationGrades.set(id, grade);

		const audit = await ports.audit.record({
			organizationId: grade.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_compensation_grade",
			entityId: grade.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.compensationGrades.delete(id);
			return audit;
		}

		return ok({ ...grade });
	}

	async updateCompensationGrade(
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			name?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationGrade>> {
		const grade = this.compensationGrades.get(input.gradeId);
		if (!grade || grade.organizationId !== input.organizationId) {
			return notFound("Compensation grade not found", HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE);
		}
		const versionCheck = assertExpectedVersion(grade.version, input.expectedVersion);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const now = new Date();
		const previous = { ...grade };
		const updated: CompensationGrade = {
			...grade,
			name: input.name ?? grade.name,
			version: grade.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.compensationGrades.set(updated.id, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_compensation_grade",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.compensationGrades.set(updated.id, previous);
			return audit;
		}

		return ok({ ...updated });
	}

	async archiveCompensationGrade(
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationGrade>> {
		const grade = this.compensationGrades.get(input.gradeId);
		if (!grade || grade.organizationId !== input.organizationId) {
			return notFound("Compensation grade not found", HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE);
		}
		const versionCheck = assertExpectedVersion(grade.version, input.expectedVersion);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const activeReferences = Array.from(this.salaryBands.values()).some(
			(band) =>
				band.organizationId === input.organizationId &&
				band.gradeId === input.gradeId &&
				isSalaryBandActive(band.status),
		);
		if (activeReferences) {
			return invalidState(
				"Cannot archive grade while active salary bands reference it",
			);
		}

		const now = new Date();
		const previous = { ...grade };
		const updated: CompensationGrade = {
			...grade,
			status: "archived",
			version: grade.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.compensationGrades.set(updated.id, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_compensation_grade",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.compensationGrades.set(updated.id, previous);
			return audit;
		}

		return ok({ ...updated });
	}

	async listCompensationGrades(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: string;
	}): Promise<Result<CompensationGradeListPage>> {
		let grades = Array.from(this.compensationGrades.values()).filter(
			(g) => g.organizationId === input.organizationId,
		);
		if (input.status) {
			grades = grades.filter((g) => g.status === input.status);
		}
		grades.sort((a, b) => a.code.localeCompare(b.code));
		const totalCount = grades.length;
		const offset = (input.page - 1) * input.pageSize;
		const paginated = grades.slice(offset, offset + input.pageSize);
		return ok({
			grades: paginated.map((g) => ({ ...g })),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// Salary Band
	async getSalaryBand(input: {
		organizationId: string;
		salaryBandId: HumanResourcesSalaryBandId;
	}): Promise<Result<SalaryBand | null>> {
		const band = this.salaryBands.get(input.salaryBandId);
		if (!band || band.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...band });
	}

	async createSalaryBand(
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
	): Promise<Result<SalaryBand>> {
		const grade = this.compensationGrades.get(record.gradeId);
		if (!grade || grade.organizationId !== record.organizationId) {
			return notFound(
				"Compensation grade not found or cross-org reference",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		if (!isCompensationGradeActive(grade.status)) {
			return invalidState("Grade must be active");
		}

		const moneyCheck = compareMoneyOrder(
			record.minAmount,
			record.midAmount,
			record.maxAmount,
		);
		if (!moneyCheck.ok) {
			return moneyCheck;
		}

		const overlapping = Array.from(this.salaryBands.values()).find(
			(band) =>
				band.organizationId === record.organizationId &&
				band.gradeId === record.gradeId &&
				(band.status === "active" || band.status === "superseded") &&
				rangesOverlap(
					band.effectiveFrom,
					band.effectiveTo,
					record.effectiveFrom,
					record.effectiveTo,
				),
		);
		if (overlapping) {
			return conflict("Overlapping salary band exists for this grade");
		}

		const idResult = parseHumanResourcesSalaryBandId(randomUUID());
		if (!idResult.ok) return idResult;
		const id = idResult.data;

		const now = new Date();
		const band: SalaryBand = {
			id,
			organizationId: record.organizationId,
			gradeId: record.gradeId,
			currencyCode: record.currencyCode,
			minAmount: record.minAmount,
			midAmount: record.midAmount,
			maxAmount: record.maxAmount,
			effectiveFrom: record.effectiveFrom,
			effectiveTo: record.effectiveTo,
			status: "active",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		this.salaryBands.set(id, band);

		const audit = await ports.audit.record({
			organizationId: band.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_salary_band",
			entityId: band.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.salaryBands.delete(id);
			return audit;
		}

		return ok({ ...band });
	}

	async supersedeSalaryBand(
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
	): Promise<Result<SalaryBand>> {
		const grade = this.compensationGrades.get(input.gradeId);
		if (!grade || grade.organizationId !== input.organizationId) {
			return notFound(
				"Compensation grade not found or cross-org reference",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const moneyCheck = compareMoneyOrder(
			input.minAmount,
			input.midAmount,
			input.maxAmount,
		);
		if (!moneyCheck.ok) {
			return moneyCheck;
		}

		const overlappingBands = Array.from(this.salaryBands.values()).filter(
			(band) =>
				band.organizationId === input.organizationId &&
				band.gradeId === input.gradeId &&
				(band.status === "active" || band.status === "superseded") &&
				rangesOverlap(
					band.effectiveFrom,
					band.effectiveTo,
					input.effectiveFrom,
					input.effectiveTo,
				),
		);

		const idResult = parseHumanResourcesSalaryBandId(randomUUID());
		if (!idResult.ok) return idResult;
		const id = idResult.data;

		const now = new Date();
		const newBand: SalaryBand = {
			id,
			organizationId: input.organizationId,
			gradeId: input.gradeId,
			currencyCode: input.currencyCode,
			minAmount: input.minAmount,
			midAmount: input.midAmount,
			maxAmount: input.maxAmount,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
			status: "active",
			version: 1,
			createdBy: input.actorUserId,
			updatedBy: input.actorUserId,
			createdAt: now,
			updatedAt: now,
		};
		this.salaryBands.set(id, newBand);

		const rollback: Array<() => void> = [() => this.salaryBands.delete(id)];

		for (const old of overlappingBands) {
			const prev = { ...old };
			const superseded: SalaryBand = {
				...old,
				status: "superseded",
				version: old.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			this.salaryBands.set(old.id, superseded);
			rollback.push(() => this.salaryBands.set(old.id, prev));
		}

		const auditNew = await ports.audit.record({
			organizationId: newBand.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_salary_band",
			entityId: newBand.id,
			action: "CREATE",
			changes: [],
		});
		if (!auditNew.ok) {
			for (const undo of rollback) undo();
			return auditNew;
		}

		for (const old of overlappingBands) {
			const auditSupersede = await ports.audit.record({
				organizationId: old.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_salary_band",
				entityId: old.id,
				action: "UPDATE",
				changes: [],
			});
			if (!auditSupersede.ok) {
				for (const undo of rollback) undo();
				return auditSupersede;
			}
		}

		return ok({ ...newBand });
	}

	async archiveSalaryBand(
		input: {
			organizationId: string;
			salaryBandId: HumanResourcesSalaryBandId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalaryBand>> {
		const band = this.salaryBands.get(input.salaryBandId);
		if (!band || band.organizationId !== input.organizationId) {
			return notFound("Salary band not found", HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE);
		}
		const versionCheck = assertExpectedVersion(band.version, input.expectedVersion);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const now = new Date();
		const previous = { ...band };
		const updated: SalaryBand = {
			...band,
			status: "archived",
			version: band.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.salaryBands.set(updated.id, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_salary_band",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.salaryBands.set(updated.id, previous);
			return audit;
		}

		return ok({ ...updated });
	}

	async listSalaryBandsByGrade(input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
		page: number;
		pageSize: number;
		status?: string;
	}): Promise<Result<SalaryBandListPage>> {
		const grade = this.compensationGrades.get(input.gradeId);
		if (!grade || grade.organizationId !== input.organizationId) {
			return notFound("Compensation grade not found", HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE);
		}

		let bands = Array.from(this.salaryBands.values()).filter(
			(b) =>
				b.organizationId === input.organizationId && b.gradeId === input.gradeId,
		);
		if (input.status) {
			bands = bands.filter((b) => b.status === input.status);
		}
		bands.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
		const totalCount = bands.length;
		const offset = (input.page - 1) * input.pageSize;
		const paginated = bands.slice(offset, offset + input.pageSize);
		return ok({
			bands: paginated.map((b) => ({ ...b })),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// Employee Compensation
	async getEmployeeCompensation(input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
	}): Promise<Result<EmployeeCompensation | null>> {
		const comp = this.employeeCompensations.get(input.compensationId);
		if (!comp || comp.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...comp });
	}

	async findEmployeeCompensationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<EmployeeCompensation | null>> {
		const key = this.idempotencyMapKey(input.organizationId, input.idempotencyKey);
		const comp = this.compensationIdempotencyByKey.get(key);
		return ok(comp === undefined ? null : { ...comp });
	}

	async createEmployeeCompensation(
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
	): Promise<Result<EmployeeCompensation>> {
		const idempKey = this.idempotencyMapKey(
			record.organizationId,
			record.createIdempotencyKey,
		);
		const existing = this.compensationIdempotencyByKey.get(idempKey);
		if (existing) {
			return ok({ ...existing });
		}

		const employment = this.employments.get(record.employmentId);
		if (!employment || employment.organizationId !== record.organizationId) {
			return notFound(
				"Employment not found or cross-org reference",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const active = Array.from(this.employeeCompensations.values()).find(
			(c) =>
				c.organizationId === record.organizationId &&
				c.employmentId === record.employmentId &&
				isEmployeeCompensationActive(c.status),
		);
		if (active) {
			return conflict("An active compensation agreement already exists for this employment");
		}

		const idResult = parseHumanResourcesEmployeeCompensationId(randomUUID());
		if (!idResult.ok) return idResult;
		const id = idResult.data;

		const now = new Date();
		const compensation: EmployeeCompensation = {
			id,
			organizationId: record.organizationId,
			employeeId: record.employeeId,
			employmentId: record.employmentId,
			gradeId: record.gradeId,
			salaryBandId: record.salaryBandId,
			baseAmount: record.baseAmount,
			currencyCode: record.currencyCode,
			effectiveFrom: record.effectiveFrom,
			effectiveTo: null,
			reason: record.reason,
			status: "active",
			sourceReviewId: record.sourceReviewId,
			createIdempotencyKey: record.createIdempotencyKey,
			fingerprint: record.createRequestFingerprint,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		this.employeeCompensations.set(id, compensation);
		this.compensationIdempotencyByKey.set(idempKey, compensation);

		const rollback: Array<() => void> = [
			() => this.employeeCompensations.delete(id),
			() => this.compensationIdempotencyByKey.delete(idempKey),
		];

		const audit = await ports.audit.record({
			organizationId: compensation.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employee_compensation",
			entityId: compensation.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			for (const undo of rollback) undo();
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: compensation.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
			payload: {
				organizationId: compensation.organizationId,
				entityType: "hr_employee_compensation",
				entityId: compensation.id,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			for (const undo of rollback) undo();
			return outbox;
		}

		return ok({ ...compensation });
	}

	async endEmployeeCompensation(
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCompensation>> {
		const comp = this.employeeCompensations.get(input.compensationId);
		if (!comp || comp.organizationId !== input.organizationId) {
			return notFound("Employee compensation not found", HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE);
		}
		const versionCheck = assertExpectedVersion(comp.version, input.expectedVersion);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (!isEmployeeCompensationActive(comp.status)) {
			return invalidState("Compensation is not active");
		}

		const now = new Date();
		const previous = { ...comp };
		const updated: EmployeeCompensation = {
			...comp,
			status: "ended",
			effectiveTo: input.endsOn,
			version: comp.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.employeeCompensations.set(updated.id, updated);

		const rollback: Array<() => void> = [
			() => this.employeeCompensations.set(updated.id, previous),
		];

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employee_compensation",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			for (const undo of rollback) undo();
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
			payload: {
				organizationId: updated.organizationId,
				entityType: "hr_employee_compensation",
				entityId: updated.id,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			for (const undo of rollback) undo();
			return outbox;
		}

		return ok({ ...updated });
	}

	async listEmployeeCompensationsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<EmployeeCompensationListPage>> {
		const compensations = Array.from(this.employeeCompensations.values()).filter(
			(c) =>
				c.organizationId === input.organizationId &&
				c.employeeId === input.employeeId,
		);
		compensations.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
		const totalCount = compensations.length;
		const offset = (input.page - 1) * input.pageSize;
		const paginated = compensations.slice(offset, offset + input.pageSize);
		return ok({
			compensations: paginated.map((c) => ({ ...c })),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	async findActiveEmployeeCompensationByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<EmployeeCompensation | null>> {
		const comp =
			Array.from(this.employeeCompensations.values()).find(
				(c) =>
					c.organizationId === input.organizationId &&
					c.employmentId === input.employmentId &&
					isEmployeeCompensationActive(c.status),
			) ?? null;
		return ok(comp === null ? null : { ...comp });
	}

	// --- Compensation Review ---

	async getCompensationReview(input: {
		organizationId: string;
		reviewId: HumanResourcesCompensationReviewId;
	}): Promise<Result<CompensationReview | null>> {
		const review = this.compensationReviews.get(input.reviewId) ?? null;
		if (review && review.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(review === null ? null : { ...review });
	}

	async findCompensationReviewByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<CompensationReview | null>> {
		const key = `${input.organizationId}:${input.idempotencyKey}`;
		const review = this.reviewIdempotencyByKey.get(key) ?? null;
		return ok(review === null ? null : { ...review });
	}

	async createCompensationReviewDraft(
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
	): Promise<Result<CompensationReview>> {
		const key = `${record.organizationId}:${record.createIdempotencyKey}`;
		const existing = this.reviewIdempotencyByKey.get(key);
		if (existing && existing.fingerprint === record.createRequestFingerprint) {
			return ok({ ...existing });
		}
		if (existing) {
			return conflict("Idempotency key already used with different data");
		}

		const employee = this.employees.get(record.employeeId);
		if (!employee || employee.organizationId !== record.organizationId) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const employment = this.employments.get(record.employmentId);
		if (!employment || employment.organizationId !== record.organizationId) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const idResult = parseHumanResourcesCompensationReviewId(randomUUID());
		if (!idResult.ok) return idResult;
		const id = idResult.data;

		const now = new Date();
		const review: CompensationReview = {
			id,
			organizationId: record.organizationId,
			employeeId: record.employeeId,
			employmentId: record.employmentId,
			status: "draft",
			proposedBaseAmount: null,
			proposedCurrencyCode: null,
			proposedGradeId: null,
			proposedSalaryBandId: null,
			recommendationNote: null,
			effectiveFrom: null,
			finalizedAt: null,
			appliedCompensationId: null,
			createIdempotencyKey: record.createIdempotencyKey,
			fingerprint: record.createRequestFingerprint,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		this.compensationReviews.set(id, review);
		this.reviewIdempotencyByKey.set(key, review);

		const audit = await ports.audit.record({
			organizationId: review.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_compensation_review",
			entityId: review.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.compensationReviews.delete(id);
			this.reviewIdempotencyByKey.delete(key);
			return audit;
		}

		return ok({ ...review });
	}

	async recordCompensationRecommendation(
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			proposedBaseAmount: string;
			proposedCurrencyCode: string;
			proposedGradeId: HumanResourcesCompensationGradeId | null;
			proposedSalaryBandId: HumanResourcesSalaryBandId | null;
			effectiveFrom: string;
			recommendationNote: string | null;
			actorUserId: string;
			expectedVersion: number;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationReview>> {
		const review = this.compensationReviews.get(input.reviewId);
		if (!review) {
			return notFound("Compensation review not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
		}
		if (review.organizationId !== input.organizationId) {
			return notFound(
				"Compensation review not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const isCompensationReviewDraft = (status: string) => status === "draft";
		if (!isCompensationReviewDraft(review.status)) {
			return invalidState("Compensation review is not in draft status");
		}

		const now = new Date();
		const previous = { ...review };
		const updated: CompensationReview = {
			...review,
			proposedBaseAmount: input.proposedBaseAmount,
			proposedCurrencyCode: input.proposedCurrencyCode,
			proposedGradeId: input.proposedGradeId,
			proposedSalaryBandId: input.proposedSalaryBandId,
			effectiveFrom: input.effectiveFrom,
			recommendationNote: input.recommendationNote,
			version: review.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.compensationReviews.set(updated.id, updated);
		const key = `${updated.organizationId}:${updated.createIdempotencyKey}`;
		this.reviewIdempotencyByKey.set(key, updated);

		const rollback: Array<() => void> = [
			() => {
				this.compensationReviews.set(updated.id, previous);
				this.reviewIdempotencyByKey.set(key, previous);
			},
		];

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_compensation_review",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			for (const undo of rollback) undo();
			return audit;
		}

		return ok({ ...updated });
	}

	async finalizeCompensationReview(
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			actorUserId: string;
			expectedVersion: number;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationReview>> {
		const review = this.compensationReviews.get(input.reviewId);
		if (!review) {
			return notFound("Compensation review not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
		}
		if (review.organizationId !== input.organizationId) {
			return notFound(
				"Compensation review not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const isCompensationReviewDraft = (status: string) => status === "draft";
		if (!isCompensationReviewDraft(review.status)) {
			return invalidState("Compensation review is not in draft status");
		}

		const now = new Date();
		const previous = { ...review };
		const updated: CompensationReview = {
			...review,
			status: "finalized",
			finalizedAt: now,
			version: review.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.compensationReviews.set(updated.id, updated);
		const key = `${updated.organizationId}:${updated.createIdempotencyKey}`;
		this.reviewIdempotencyByKey.set(key, updated);

		const rollback: Array<() => void> = [
			() => {
				this.compensationReviews.set(updated.id, previous);
				this.reviewIdempotencyByKey.set(key, previous);
			},
		];

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_compensation_review",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			for (const undo of rollback) undo();
			return audit;
		}

		return ok({ ...updated });
	}

	async applyApprovedCompensationResult(
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			reason: string;
			createIdempotencyKey: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCompensation>> {
		const review = this.compensationReviews.get(input.reviewId);
		if (!review) {
			return notFound("Compensation review not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
		}
		if (review.organizationId !== input.organizationId) {
			return notFound(
				"Compensation review not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		if (!isCompensationReviewFinalized(review.status)) {
			return invalidState("Compensation review is not finalized");
		}

		if (
			!review.proposedBaseAmount ||
			!review.proposedCurrencyCode ||
			!review.effectiveFrom
		) {
			return invalidState(
				"Review must have proposed amount, currency, and effective date",
			);
		}

		const employment = this.employments.get(review.employmentId);
		if (!employment || employment.organizationId !== input.organizationId) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const activeComp = Array.from(this.employeeCompensations.values()).find(
			(c) =>
				c.organizationId === input.organizationId &&
				c.employmentId === review.employmentId &&
				isEmployeeCompensationActive(c.status),
		);

		const rollback: Array<() => void> = [];

		if (activeComp) {
			const previous = { ...activeComp };
			const ended: EmployeeCompensation = {
				...activeComp,
				status: "ended",
				effectiveTo: review.effectiveFrom,
				version: activeComp.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: new Date(),
			};
			this.employeeCompensations.set(ended.id, ended);
			rollback.push(() => this.employeeCompensations.set(ended.id, previous));

			const audit = await ports.audit.record({
				organizationId: ended.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employee_compensation",
				entityId: ended.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				for (const undo of rollback) undo();
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: ended.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
				payload: {
					organizationId: ended.organizationId,
					entityType: "hr_employee_compensation",
					entityId: ended.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				for (const undo of rollback) undo();
				return outbox;
			}
		}

		const idResult = parseHumanResourcesEmployeeCompensationId(randomUUID());
		if (!idResult.ok) return idResult;
		const id = idResult.data;

		const now = new Date();
		const newComp: EmployeeCompensation = {
			id,
			organizationId: input.organizationId,
			employeeId: review.employeeId,
			employmentId: review.employmentId,
			gradeId: review.proposedGradeId,
			salaryBandId: review.proposedSalaryBandId,
			baseAmount: review.proposedBaseAmount,
			currencyCode: review.proposedCurrencyCode,
			effectiveFrom: review.effectiveFrom,
			effectiveTo: null,
			reason: input.reason,
			sourceReviewId: input.reviewId,
			status: "active",
			createIdempotencyKey: input.createIdempotencyKey,
			fingerprint: `${review.effectiveFrom}:${review.proposedBaseAmount}:${review.proposedCurrencyCode}`,
			version: 1,
			createdBy: input.actorUserId,
			updatedBy: input.actorUserId,
			createdAt: now,
			updatedAt: now,
		};
		this.employeeCompensations.set(id, newComp);
		const key = `${newComp.organizationId}:${newComp.createIdempotencyKey}`;
		this.compensationIdempotencyByKey.set(key, newComp);
		rollback.push(() => {
			this.employeeCompensations.delete(id);
			this.compensationIdempotencyByKey.delete(key);
		});

		const audit = await ports.audit.record({
			organizationId: newComp.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employee_compensation",
			entityId: newComp.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			for (const undo of rollback) undo();
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: newComp.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
			payload: {
				organizationId: newComp.organizationId,
				entityType: "hr_employee_compensation",
				entityId: newComp.id,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			for (const undo of rollback) undo();
			return outbox;
		}

		return ok({ ...newComp });
	}

	async listCompensationReviewsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<CompensationReviewListPage>> {
		const reviews = Array.from(this.compensationReviews.values()).filter(
			(r) =>
				r.organizationId === input.organizationId &&
				r.employeeId === input.employeeId,
		);
		reviews.sort((a, b) => {
			const aDate = a.createdAt.toISOString();
			const bDate = b.createdAt.toISOString();
			return bDate.localeCompare(aDate);
		});
		const totalCount = reviews.length;
		const offset = (input.page - 1) * input.pageSize;
		const paginated = reviews.slice(offset, offset + input.pageSize);
		return ok({
			reviews: paginated.map((r) => ({ ...r })),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// --- Benefit Plan ---

	async getBenefitPlan(input: {
		organizationId: string;
		planId: HumanResourcesBenefitPlanId;
	}): Promise<Result<BenefitPlan | null>> {
		const plan = this.benefitPlans.get(input.planId) ?? null;
		if (plan && plan.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(plan === null ? null : { ...plan });
	}

	async findBenefitPlanByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<BenefitPlan | null>> {
		const plan =
			Array.from(this.benefitPlans.values()).find(
				(p) =>
					p.organizationId === input.organizationId && p.code === input.code,
			) ?? null;
		return ok(plan === null ? null : { ...plan });
	}

	async createBenefitPlan(
		record: {
			organizationId: string;
			code: string;
			name: string;
			eligibilityNote: string | null;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitPlan>> {
		const existing = Array.from(this.benefitPlans.values()).find(
			(p) =>
				p.organizationId === record.organizationId && p.code === record.code,
		);
		if (existing) {
			return conflict("Benefit plan code already exists");
		}

		const idResult = parseHumanResourcesBenefitPlanId(randomUUID());
		if (!idResult.ok) return idResult;
		const id = idResult.data;
		const now = new Date();
		const plan: BenefitPlan = {
			id,
			organizationId: record.organizationId,
			code: record.code,
			name: record.name,
			eligibilityNote: record.eligibilityNote,
			status: "active",
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		this.benefitPlans.set(id, plan);

		const audit = await ports.audit.record({
			organizationId: plan.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_benefit_plan",
			entityId: plan.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.benefitPlans.delete(id);
			return audit;
		}

		return ok({ ...plan });
	}

	async updateBenefitPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			name?: string;
			eligibilityNote?: string | null;
			actorUserId: string;
			expectedVersion: number;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitPlan>> {
		const plan = this.benefitPlans.get(input.planId);
		if (!plan) {
			return notFound("Benefit plan not found");
		}
		if (plan.organizationId !== input.organizationId) {
			return notFound(
				"Benefit plan not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const versionCheck = assertExpectedVersion(
			plan.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const now = new Date();
		const previous = { ...plan };
		const updated: BenefitPlan = {
			...plan,
			name: input.name ?? plan.name,
			eligibilityNote:
				input.eligibilityNote !== undefined
					? input.eligibilityNote
					: plan.eligibilityNote,
			version: plan.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.benefitPlans.set(updated.id, updated);

		const rollback: Array<() => void> = [
			() => this.benefitPlans.set(updated.id, previous),
		];

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_benefit_plan",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			for (const undo of rollback) undo();
			return audit;
		}

		return ok({ ...updated });
	}

	async archiveBenefitPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			actorUserId: string;
			expectedVersion: number;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitPlan>> {
		const plan = this.benefitPlans.get(input.planId);
		if (!plan) {
			return notFound("Benefit plan not found");
		}
		if (plan.organizationId !== input.organizationId) {
			return notFound(
				"Benefit plan not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const versionCheck = assertExpectedVersion(
			plan.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const now = new Date();
		const previous = { ...plan };
		const updated: BenefitPlan = {
			...plan,
			status: "archived",
			version: plan.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.benefitPlans.set(updated.id, updated);

		const rollback: Array<() => void> = [
			() => this.benefitPlans.set(updated.id, previous),
		];

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_benefit_plan",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			for (const undo of rollback) undo();
			return audit;
		}

		return ok({ ...updated });
	}

	async listBenefitPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
	}): Promise<Result<BenefitPlanListPage>> {
		const plans = Array.from(this.benefitPlans.values()).filter(
			(p) => p.organizationId === input.organizationId,
		);
		plans.sort((a, b) => a.code.localeCompare(b.code));
		const totalCount = plans.length;
		const offset = (input.page - 1) * input.pageSize;
		const paginated = plans.slice(offset, offset + input.pageSize);
		return ok({
			plans: paginated.map((p) => ({ ...p })),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// --- Benefit Enrollment ---

	async getBenefitEnrollment(input: {
		organizationId: string;
		enrollmentId: HumanResourcesBenefitEnrollmentId;
	}): Promise<Result<BenefitEnrollment | null>> {
		const enrollment = this.benefitEnrollments.get(input.enrollmentId) ?? null;
		if (enrollment && enrollment.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(enrollment === null ? null : { ...enrollment });
	}

	async findBenefitEnrollmentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<BenefitEnrollment | null>> {
		const key = `${input.organizationId}:${input.idempotencyKey}`;
		const enrollment = this.enrollmentIdempotencyByKey.get(key) ?? null;
		return ok(enrollment === null ? null : { ...enrollment });
	}

	async enrolBenefit(
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
	): Promise<Result<BenefitEnrollment>> {
		const key = `${record.organizationId}:${record.createIdempotencyKey}`;
		const existing = this.enrollmentIdempotencyByKey.get(key);
		if (
			existing &&
			existing.fingerprint === record.createRequestFingerprint
		) {
			return ok({ ...existing });
		}
		if (existing) {
			return conflict("Idempotency key already used with different data");
		}

		const employee = this.employees.get(record.employeeId);
		if (!employee || employee.organizationId !== record.organizationId) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const employment = this.employments.get(record.employmentId);
		if (!employment || employment.organizationId !== record.organizationId) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const plan = this.benefitPlans.get(record.planId);
		if (!plan || plan.organizationId !== record.organizationId) {
			return notFound(
				"Benefit plan not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const activeEnrollment = Array.from(this.benefitEnrollments.values()).find(
			(e) =>
				e.organizationId === record.organizationId &&
				e.employeeId === record.employeeId &&
				e.planId === record.planId &&
				isBenefitEnrollmentActive(e.status),
		);
		if (activeEnrollment) {
			return conflict("Employee already has an active enrollment for this plan");
		}

		const idResult = parseHumanResourcesBenefitEnrollmentId(randomUUID());
		if (!idResult.ok) return idResult;
		const id = idResult.data;
		const now = new Date();
		const enrollment: BenefitEnrollment = {
			id,
			organizationId: record.organizationId,
			employeeId: record.employeeId,
			employmentId: record.employmentId,
			planId: record.planId,
			effectiveFrom: record.effectiveFrom,
			effectiveTo: null,
			status: "active",
			createIdempotencyKey: record.createIdempotencyKey,
			fingerprint: record.createRequestFingerprint,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		this.benefitEnrollments.set(id, enrollment);
		this.enrollmentIdempotencyByKey.set(key, enrollment);

		const rollback: Array<() => void> = [
			() => {
				this.benefitEnrollments.delete(id);
				this.enrollmentIdempotencyByKey.delete(key);
			},
		];

		const audit = await ports.audit.record({
			organizationId: enrollment.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_benefit_enrollment",
			entityId: enrollment.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			for (const undo of rollback) undo();
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: enrollment.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
			payload: {
				organizationId: enrollment.organizationId,
				entityType: "hr_benefit_enrollment",
				entityId: enrollment.id,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			for (const undo of rollback) undo();
			return outbox;
		}

		return ok({ ...enrollment });
	}

	async endBenefitEnrollment(
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			endsOn: string;
			actorUserId: string;
			expectedVersion: number;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitEnrollment>> {
		const enrollment = this.benefitEnrollments.get(input.enrollmentId);
		if (!enrollment) {
			return notFound("Benefit enrollment not found");
		}
		if (enrollment.organizationId !== input.organizationId) {
			return notFound(
				"Benefit enrollment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const versionCheck = assertExpectedVersion(
			enrollment.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (!isBenefitEnrollmentActive(enrollment.status)) {
			return invalidState("Benefit enrollment is not active");
		}

		const now = new Date();
		const previous = { ...enrollment };
		const updated: BenefitEnrollment = {
			...enrollment,
			status: "ended",
			effectiveTo: input.endsOn,
			version: enrollment.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.benefitEnrollments.set(updated.id, updated);
		const key = `${updated.organizationId}:${updated.createIdempotencyKey}`;
		this.enrollmentIdempotencyByKey.set(key, updated);

		const rollback: Array<() => void> = [
			() => {
				this.benefitEnrollments.set(updated.id, previous);
				this.enrollmentIdempotencyByKey.set(key, previous);
			},
		];

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_benefit_enrollment",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			for (const undo of rollback) undo();
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
			payload: {
				organizationId: updated.organizationId,
				entityType: "hr_benefit_enrollment",
				entityId: updated.id,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			for (const undo of rollback) undo();
			return outbox;
		}

		return ok({ ...updated });
	}

	async cancelBenefitEnrollment(
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			actorUserId: string;
			expectedVersion: number;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitEnrollment>> {
		const enrollment = this.benefitEnrollments.get(input.enrollmentId);
		if (!enrollment) {
			return notFound("Benefit enrollment not found");
		}
		if (enrollment.organizationId !== input.organizationId) {
			return notFound(
				"Benefit enrollment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const versionCheck = assertExpectedVersion(
			enrollment.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (!isBenefitEnrollmentActive(enrollment.status)) {
			return invalidState("Benefit enrollment is not active");
		}

		const now = new Date();
		const previous = { ...enrollment };
		const updated: BenefitEnrollment = {
			...enrollment,
			status: "cancelled",
			version: enrollment.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.benefitEnrollments.set(updated.id, updated);
		const key = `${updated.organizationId}:${updated.createIdempotencyKey}`;
		this.enrollmentIdempotencyByKey.set(key, updated);

		const rollback: Array<() => void> = [
			() => {
				this.benefitEnrollments.set(updated.id, previous);
				this.enrollmentIdempotencyByKey.set(key, previous);
			},
		];

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_benefit_enrollment",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			for (const undo of rollback) undo();
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			type: HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
			payload: {
				organizationId: updated.organizationId,
				entityType: "hr_benefit_enrollment",
				entityId: updated.id,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			for (const undo of rollback) undo();
			return outbox;
		}

		return ok({ ...updated });
	}

	async listBenefitEnrollmentsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<BenefitEnrollmentListPage>> {
		const enrollments = Array.from(this.benefitEnrollments.values()).filter(
			(e) =>
				e.organizationId === input.organizationId &&
				e.employeeId === input.employeeId,
		);
		enrollments.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
		const totalCount = enrollments.length;
		const offset = (input.page - 1) * input.pageSize;
		const paginated = enrollments.slice(offset, offset + input.pageSize);
		return ok({
			enrollments: paginated.map((e) => ({ ...e })),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	}

	// --- Handoff ---

	async getApprovedCompensationHandoff(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ApprovedCompensationHandoff | null>> {
		const employee = this.employees.get(input.employeeId);
		if (!employee || employee.organizationId !== input.organizationId) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const activeEmployment = Array.from(this.employments.values()).find(
			(e) =>
				e.organizationId === input.organizationId &&
				e.employeeId === input.employeeId &&
				e.status === "active",
		);

		let activeCompensation: EmployeeCompensation | null = null;
		if (activeEmployment) {
			activeCompensation =
				Array.from(this.employeeCompensations.values()).find(
					(c) =>
						c.organizationId === input.organizationId &&
						c.employmentId === activeEmployment.id &&
						isEmployeeCompensationActive(c.status),
				) ?? null;
		}

		if (!activeCompensation) {
			return ok(null);
		}

		const activeBenefitEnrollments = Array.from(
			this.benefitEnrollments.values(),
		).filter(
			(e) =>
				e.organizationId === input.organizationId &&
				e.employeeId === input.employeeId &&
				isBenefitEnrollmentActive(e.status),
		);

		const handoff: ApprovedCompensationHandoff = {
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			activeCompensation: { ...activeCompensation },
			activeBenefitEnrollments: activeBenefitEnrollments.map((e) => ({ ...e })),
		};

		return ok(handoff);
	}
}

export function createMemoryHumanResourcesStore(): MemoryHumanResourcesStore {
	return new MemoryHumanResourcesStore();
}
