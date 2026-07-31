import { randomUUID } from "node:crypto";

import {
	audit as afendaAudit,
	type PreparedTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	asc,
	desc,
	eq,
	hrClearance,
	hrEmploymentConfirmation,
	hrEmploymentMovement,
	hrOffboardingAccessRevocation,
	hrOffboardingCase,
	hrOffboardingPayrollHandoff,
	hrOffboardingTask,
	hrOnboardingAccessHandoff,
	hrOnboardingCase,
	hrOnboardingEquipmentHandoff,
	hrOnboardingOrientation,
	hrOnboardingTask,
	hrProbationAssessment,
	hrProbationReview,
	hrTermination,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	HUMAN_RESOURCES_CLEARANCE_COMPLETED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_PROBATION_ASSESSMENT_RECORDED_EVENT,
	HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT,
	HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT,
} from "@afenda/events/schemas";

import {
	parseHumanResourcesAssignmentId,
	parseHumanResourcesClearanceId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentConfirmationId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesEmploymentMovementId,
	parseHumanResourcesOffboardingAccessRevocationId,
	parseHumanResourcesOffboardingCaseId,
	parseHumanResourcesOffboardingPayrollHandoffId,
	parseHumanResourcesOffboardingTaskId,
	parseHumanResourcesOfferId,
	parseHumanResourcesOnboardingAccessHandoffId,
	parseHumanResourcesOnboardingCaseId,
	parseHumanResourcesOnboardingEquipmentHandoffId,
	parseHumanResourcesOnboardingOrientationId,
	parseHumanResourcesOnboardingTaskId,
	parseHumanResourcesPositionId,
	parseHumanResourcesProbationAssessmentId,
	parseHumanResourcesProbationReviewId,
	parseHumanResourcesTerminationId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import {
	ONBOARDING_TASK_CODE_ACCESS_HANDOFF,
	ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF,
	ONBOARDING_TASK_CODE_ORIENTATION,
} from "../../lifecycle/onboarding-checklist";
import { assertTransferAssignmentRanges } from "../../shared/assignment-guards";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	assertActivePosition,
	conflict,
	invalidInput,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import { previousIsoDate } from "../../shared/effective-dates";
import { assertValidDateRange } from "../../shared/employment-status";
import { fingerprintTransfer } from "../../shared/fingerprint";
import {
	assertConfirmationEffectiveOn,
	assertEmploymentActiveForOnboarding,
	assertEmploymentForOffboarding,
	assertLatestProbationPassed,
	assertOffboardingCaseInProgress,
	assertOnboardingAccessHandoffStatusTransition,
	assertOnboardingCaseInProgress,
	assertOnboardingEquipmentHandoffStatusTransition,
	assertOnboardingOrientationStatusTransition,
	assertOnboardingReadyToComplete,
	assertProbationAssessmentReviewedOn,
	assertProbationDateRange,
	assertProbationExtension,
	assertProbationOpen,
	assertProbationOutcomeRecordedOn,
	assertTerminationApprovable,
	assertTerminationEffectiveDate,
	assertTerminationFinalizable,
} from "../../shared/lifecycle-guards";
import type { ProbationOutcome } from "../../shared/lifecycle-status";
import {
	clearanceStatusSchema,
	lifecycleTaskStatusSchema,
	movementKindSchema,
	offboardingAccessRevocationStatusSchema,
	offboardingCaseStatusSchema,
	offboardingPayrollHandoffStatusSchema,
	onboardingAccessHandoffStatusSchema,
	onboardingCaseStatusSchema,
	onboardingEquipmentHandoffStatusSchema,
	onboardingOrientationStatusSchema,
	probationOutcomeSchema,
	probationStatusSchema,
	terminationStatusSchema,
} from "../../shared/lifecycle-status";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { HumanResourcesStore } from "../../store";
import type {
	Clearance,
	EmploymentConfirmation,
	EmploymentMovement,
	OffboardingAccessRevocation,
	OffboardingCase,
	OffboardingPayrollHandoff,
	OffboardingTask,
	OnboardingAccessHandoff,
	OnboardingCase,
	OnboardingEquipmentHandoff,
	OnboardingOrientation,
	OnboardingTask,
	ProbationAssessment,
	ProbationReview,
	Termination,
} from "../../types";

const LIFECYCLE_AUDIT_SOURCE = "human-resources.lifecycle-drizzle";

type LifecycleAuditEntity =
	| "hr_clearance"
	| "hr_employment_confirmation"
	| "hr_employment_movement"
	| "hr_exit_interview"
	| "hr_offboarding_access_revocation"
	| "hr_offboarding_case"
	| "hr_offboarding_payroll_handoff"
	| "hr_offboarding_task"
	| "hr_onboarding_access_handoff"
	| "hr_onboarding_case"
	| "hr_onboarding_equipment_handoff"
	| "hr_onboarding_orientation"
	| "hr_onboarding_task"
	| "hr_probation_assessment"
	| "hr_probation_review"
	| "hr_termination";

interface LifecycleAuditInput {
	action: "CREATE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	entity: LifecycleAuditEntity;
	entityId: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	reasonCode: string;
}

function prepareLifecycleAudit(
	input: LifecycleAuditInput,
): Result<PreparedTransactionalAuditInsertValues> {
	return afendaAudit.transaction.prepare({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		oldValue: input.oldValue ?? null,
		newValue: input.newValue ?? null,
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: LIFECYCLE_AUDIT_SOURCE,
			occurredAt: null,
			causationId: null,
			reasonCode: input.reasonCode,
		},
	});
}

/** Neon HTTP RETURNING rows may surface timestamptz as strings; Drizzle select returns Date. */
function parseDate(value: Date | string): Date {
	return value instanceof Date ? value : new Date(value);
}

/** Public EmploymentMovement boundary: ISO datetime string with offset (Z). */
function toIsoDateTime(value: Date | string): string {
	return parseDate(value).toISOString();
}

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

function probationReviewEventBase(
	probation: ProbationReview,
	actorId: string,
	correlationId: string,
) {
	return {
		organizationId: probation.organizationId,
		entityType: "hr_probation_review",
		entityId: probation.id,
		actorId,
		correlationId,
		employmentId: probation.employmentId,
	};
}

function withOptionalEvidenceReference<T extends Record<string, unknown>>(
	payload: T,
	evidenceReference: string | null,
): T & { evidenceReference?: string } {
	if (evidenceReference === null) {
		return payload;
	}
	return { ...payload, evidenceReference };
}

interface LifecycleHost {
	findOpenAssignmentByEmployment: HumanResourcesStore["findOpenAssignmentByEmployment"];
	getEmploymentById: HumanResourcesStore["getEmploymentById"];
	getPositionById: HumanResourcesStore["getPositionById"];
	listAssignmentsByEmployment: HumanResourcesStore["listAssignmentsByEmployment"];
}

type OnboardingCompletionHost = Pick<
	HumanResourcesStore,
	| "getOnboardingCase"
	| "listOnboardingTasks"
	| "getOnboardingOrientationByCase"
	| "getOnboardingEquipmentHandoffByCase"
	| "getOnboardingAccessHandoffByCase"
>;

async function diagnoseOnboardingCompletionFailure(
	host: OnboardingCompletionHost,
	input: Parameters<HumanResourcesStore["getOnboardingCase"]>[0],
): Promise<Result<never>> {
	const existing = await host.getOnboardingCase(input);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound("Onboarding case not found");
	}
	if (existing.data.status !== "in_progress") {
		return invalidState("Onboarding case must be in progress");
	}
	const tasks = await host.listOnboardingTasks(input);
	if (!tasks.ok) {
		return tasks;
	}
	const orientation = await host.getOnboardingOrientationByCase(input);
	if (!orientation.ok) {
		return orientation;
	}
	const equipment = await host.getOnboardingEquipmentHandoffByCase(input);
	if (!equipment.ok) {
		return equipment;
	}
	const access = await host.getOnboardingAccessHandoffByCase(input);
	if (!access.ok) {
		return access;
	}
	const ready = assertOnboardingReadyToComplete({
		mandatoryTasksComplete: tasks.data.every(
			(task) =>
				!task.mandatory ||
				task.status === "completed" ||
				task.status === "waived",
		),
		orientationStatus: orientation.data?.status ?? null,
		equipmentHandoffStatus: equipment.data?.status ?? null,
		accessHandoffStatus: access.data?.status ?? null,
	});
	return ready.ok ? invalidState("Onboarding is not ready to complete") : ready;
}

export type DrizzleLifecycleMethods = Pick<
	HumanResourcesStore,
	| "getOnboardingCase"
	| "findOnboardingByStartIdempotencyKey"
	| "startOnboarding"
	| "completeOnboardingTask"
	| "completeOnboarding"
	| "listOnboardingTasks"
	| "getOnboardingTask"
	| "getOnboardingOrientationByCase"
	| "getOnboardingEquipmentHandoffByCase"
	| "getOnboardingAccessHandoffByCase"
	| "recordOnboardingOrientation"
	| "recordOnboardingEquipmentHandoff"
	| "recordOnboardingAccessHandoff"
	| "getProbationReview"
	| "listProbationReviewsByEmployment"
	| "listProbationAssessments"
	| "findProbationByOpenIdempotencyKey"
	| "openProbation"
	| "extendProbation"
	| "recordProbationAssessment"
	| "recordProbationOutcome"
	| "getEmploymentConfirmation"
	| "findConfirmationByIdempotencyKey"
	| "confirmEmployment"
	| "findTransferByIdempotencyKey"
	| "transferAssignment"
	| "getTermination"
	| "findTerminationByIdempotencyKey"
	| "proposeTermination"
	| "approveTermination"
	| "finalizeTermination"
	| "getOffboardingCase"
	| "findOffboardingByStartIdempotencyKey"
	| "startOffboarding"
	| "completeOffboardingTask"
	| "recordExitInterview"
	| "recordClearance"
	| "completeOffboarding"
	| "listOffboardingTasks"
	| "getClearanceByOffboardingCase"
	| "getOffboardingAccessRevocationByCase"
	| "getOffboardingPayrollHandoffByCase"
	| "recordOffboardingAccessRevocation"
	| "recordOffboardingPayrollHandoff"
>;

function mapOnboardingCase(
	row: typeof hrOnboardingCase.$inferSelect,
): Result<OnboardingCase> {
	const id = parseHumanResourcesOnboardingCaseId(row.id);
	if (!id.ok) {
		return id;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const status = onboardingCaseStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	let sourceOfferId = null as OnboardingCase["sourceOfferId"];
	if (row.sourceOfferId !== null) {
		const offerId = parseHumanResourcesOfferId(row.sourceOfferId);
		if (!offerId.ok) {
			return offerId;
		}
		sourceOfferId = offerId.data;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		status: status.data,
		sourceOfferId,
		startedAt: row.startedAt,
		completedAt: row.completedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapProbation(
	row: typeof hrProbationReview.$inferSelect,
): Result<ProbationReview> {
	const id = parseHumanResourcesProbationReviewId(row.id);
	if (!id.ok) {
		return id;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const status = probationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	let outcome: ProbationOutcome | null = null;
	if (row.outcome !== null) {
		const parsed = probationOutcomeSchema.safeParse(row.outcome);
		if (!parsed.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		outcome = parsed.data;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		status: status.data,
		startsOn: row.startsOn,
		endsOn: row.endsOn,
		outcome,
		outcomeActorId: row.outcomeActorId,
		outcomeRecordedOn: row.outcomeRecordedOn,
		lastExtensionReason: row.lastExtensionReason,
		lastExtensionEvidenceReference: row.lastExtensionEvidenceReference,
		outcomeReason: row.outcomeReason,
		outcomeEvidenceReference: row.outcomeEvidenceReference,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapProbationAssessment(
	row: typeof hrProbationAssessment.$inferSelect,
): Result<ProbationAssessment> {
	const id = parseHumanResourcesProbationAssessmentId(row.id);
	if (!id.ok) {
		return id;
	}
	const probationReviewId = parseHumanResourcesProbationReviewId(
		row.probationReviewId,
	);
	if (!probationReviewId.ok) {
		return probationReviewId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		probationReviewId: probationReviewId.data,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		reviewedOn: row.reviewedOn,
		reason: row.reason,
		evidenceReference: row.evidenceReference,
		actorUserId: row.actorUserId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapConfirmation(
	row: typeof hrEmploymentConfirmation.$inferSelect,
): Result<EmploymentConfirmation> {
	const id = parseHumanResourcesEmploymentConfirmationId(row.id);
	if (!id.ok) {
		return id;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		confirmedOn: row.confirmedOn,
		confirmedBy: row.confirmedBy,
		evidenceNote: row.evidenceNote,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapMovement(
	row: Omit<
		typeof hrEmploymentMovement.$inferSelect,
		"createdAt" | "updatedAt"
	> & {
		createdAt: Date | string;
		updatedAt: Date | string;
	},
): Result<EmploymentMovement> {
	const id = parseHumanResourcesEmploymentMovementId(row.id);
	if (!id.ok) {
		return id;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const fromAssignmentId = parseHumanResourcesAssignmentId(
		row.fromAssignmentId,
	);
	if (!fromAssignmentId.ok) {
		return fromAssignmentId;
	}
	const toAssignmentId = parseHumanResourcesAssignmentId(row.toAssignmentId);
	if (!toAssignmentId.ok) {
		return toAssignmentId;
	}
	const fromPositionId = parseHumanResourcesPositionId(row.fromPositionId);
	if (!fromPositionId.ok) {
		return fromPositionId;
	}
	const toPositionId = parseHumanResourcesPositionId(row.toPositionId);
	if (!toPositionId.ok) {
		return toPositionId;
	}
	const kind = movementKindSchema.safeParse(row.movementKind);
	if (!kind.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		movementKind: kind.data,
		fromAssignmentId: fromAssignmentId.data,
		toAssignmentId: toAssignmentId.data,
		fromPositionId: fromPositionId.data,
		toPositionId: toPositionId.data,
		effectiveOn: row.effectiveOn,
		reason: row.reason,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: toIsoDateTime(row.createdAt),
		updatedAt: toIsoDateTime(row.updatedAt),
	});
}

function mapTermination(
	row: typeof hrTermination.$inferSelect,
): Result<Termination> {
	const id = parseHumanResourcesTerminationId(row.id);
	if (!id.ok) {
		return id;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const status = terminationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		status: status.data,
		reasonCode: row.reasonCode,
		reasonDetail: row.reasonDetail,
		effectiveOn: row.effectiveOn,
		approvedAt: row.approvedAt,
		approvedBy: row.approvedBy,
		rehireEligible: row.rehireEligible,
		finalizedAt: row.finalizedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapOffboardingCase(
	row: typeof hrOffboardingCase.$inferSelect,
): Result<OffboardingCase> {
	const id = parseHumanResourcesOffboardingCaseId(row.id);
	if (!id.ok) {
		return id;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const status = offboardingCaseStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	let terminationId = null as OffboardingCase["terminationId"];
	if (row.terminationId !== null) {
		const parsed = parseHumanResourcesTerminationId(row.terminationId);
		if (!parsed.ok) {
			return parsed;
		}
		terminationId = parsed.data;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		terminationId,
		status: status.data,
		startedAt: row.startedAt,
		completedAt: row.completedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapOnboardingTask(
	row: typeof hrOnboardingTask.$inferSelect,
): Result<OnboardingTask> {
	const id = parseHumanResourcesOnboardingTaskId(row.id);
	if (!id.ok) {
		return id;
	}
	const caseId = parseHumanResourcesOnboardingCaseId(row.caseId);
	if (!caseId.ok) {
		return caseId;
	}
	const status = lifecycleTaskStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		caseId: caseId.data,
		code: row.code,
		title: row.title,
		mandatory: row.mandatory,
		status: status.data,
		completedAt: row.completedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapOffboardingTask(
	row: typeof hrOffboardingTask.$inferSelect,
): Result<OffboardingTask> {
	const id = parseHumanResourcesOffboardingTaskId(row.id);
	if (!id.ok) {
		return id;
	}
	const caseId = parseHumanResourcesOffboardingCaseId(row.caseId);
	if (!caseId.ok) {
		return caseId;
	}
	const status = lifecycleTaskStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		caseId: caseId.data,
		code: row.code,
		title: row.title,
		mandatory: row.mandatory,
		status: status.data,
		completedAt: row.completedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapClearance(row: typeof hrClearance.$inferSelect): Result<Clearance> {
	const id = parseHumanResourcesClearanceId(row.id);
	if (!id.ok) {
		return id;
	}
	const offboardingCaseId = parseHumanResourcesOffboardingCaseId(
		row.offboardingCaseId,
	);
	if (!offboardingCaseId.ok) {
		return offboardingCaseId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const status = clearanceStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		offboardingCaseId: offboardingCaseId.data,
		employmentId: employmentId.data,
		status: status.data,
		clearedOn: row.clearedOn,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapOffboardingAccessRevocation(
	row: typeof hrOffboardingAccessRevocation.$inferSelect,
): Result<OffboardingAccessRevocation> {
	const id = parseHumanResourcesOffboardingAccessRevocationId(row.id);
	if (!id.ok) {
		return id;
	}
	const offboardingCaseId = parseHumanResourcesOffboardingCaseId(
		row.offboardingCaseId,
	);
	if (!offboardingCaseId.ok) {
		return offboardingCaseId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const status = offboardingAccessRevocationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		offboardingCaseId: offboardingCaseId.data,
		employmentId: employmentId.data,
		status: status.data,
		revokedOn: row.revokedOn,
		summary: row.summary,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapOffboardingPayrollHandoff(
	row: typeof hrOffboardingPayrollHandoff.$inferSelect,
): Result<OffboardingPayrollHandoff> {
	const id = parseHumanResourcesOffboardingPayrollHandoffId(row.id);
	if (!id.ok) {
		return id;
	}
	const offboardingCaseId = parseHumanResourcesOffboardingCaseId(
		row.offboardingCaseId,
	);
	if (!offboardingCaseId.ok) {
		return offboardingCaseId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const status = offboardingPayrollHandoffStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		offboardingCaseId: offboardingCaseId.data,
		employmentId: employmentId.data,
		status: status.data,
		readyOn: row.readyOn,
		summary: row.summary,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapOnboardingOrientation(
	row: typeof hrOnboardingOrientation.$inferSelect,
): Result<OnboardingOrientation> {
	const id = parseHumanResourcesOnboardingOrientationId(row.id);
	if (!id.ok) {
		return id;
	}
	const onboardingCaseId = parseHumanResourcesOnboardingCaseId(
		row.onboardingCaseId,
	);
	if (!onboardingCaseId.ok) {
		return onboardingCaseId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const status = onboardingOrientationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		onboardingCaseId: onboardingCaseId.data,
		employmentId: employmentId.data,
		status: status.data,
		acknowledgedOn: row.acknowledgedOn,
		notes: row.notes,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapOnboardingEquipmentHandoff(
	row: typeof hrOnboardingEquipmentHandoff.$inferSelect,
): Result<OnboardingEquipmentHandoff> {
	const id = parseHumanResourcesOnboardingEquipmentHandoffId(row.id);
	if (!id.ok) {
		return id;
	}
	const onboardingCaseId = parseHumanResourcesOnboardingCaseId(
		row.onboardingCaseId,
	);
	if (!onboardingCaseId.ok) {
		return onboardingCaseId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const status = onboardingEquipmentHandoffStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		onboardingCaseId: onboardingCaseId.data,
		employmentId: employmentId.data,
		status: status.data,
		handedOverOn: row.handedOverOn,
		summary: row.summary,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapOnboardingAccessHandoff(
	row: typeof hrOnboardingAccessHandoff.$inferSelect,
): Result<OnboardingAccessHandoff> {
	const id = parseHumanResourcesOnboardingAccessHandoffId(row.id);
	if (!id.ok) {
		return id;
	}
	const onboardingCaseId = parseHumanResourcesOnboardingCaseId(
		row.onboardingCaseId,
	);
	if (!onboardingCaseId.ok) {
		return onboardingCaseId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const status = onboardingAccessHandoffStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		onboardingCaseId: onboardingCaseId.data,
		employmentId: employmentId.data,
		status: status.data,
		grantedOn: row.grantedOn,
		summary: row.summary,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

/** Raw Neon HTTP CTE rows use snake_case column names. */
interface OnboardingCaseSqlRow {
	completed_at: Date | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string;
	id: string;
	organization_id: string;
	source_offer_id: string | null;
	started_at: Date;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface ProbationSqlRow {
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string;
	ends_on: string;
	id: string;
	last_extension_evidence_reference: string | null;
	last_extension_reason: string | null;
	organization_id: string;
	outcome: string | null;
	outcome_actor_id: string | null;
	outcome_evidence_reference: string | null;
	outcome_reason: string | null;
	outcome_recorded_on: string | null;
	starts_on: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface ProbationAssessmentSqlRow {
	actor_user_id: string;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string;
	evidence_reference: string | null;
	id: string;
	organization_id: string;
	probation_review_id: string;
	reason: string;
	reviewed_on: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface ConfirmationSqlRow {
	confirmed_by: string;
	confirmed_on: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string;
	evidence_note: string;
	id: string;
	organization_id: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface MovementSqlRow {
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date | string;
	created_by: string;
	effective_on: string;
	employee_id: string;
	employment_id: string;
	from_assignment_id: string;
	from_position_id: string;
	id: string;
	movement_kind: string;
	organization_id: string;
	reason: string;
	to_assignment_id: string;
	to_position_id: string;
	updated_at: Date | string;
	updated_by: string;
	version: number;
}

interface TerminationSqlRow {
	approved_at: Date | null;
	approved_by: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	effective_on: string;
	employee_id: string;
	employment_id: string;
	finalized_at: Date | null;
	id: string;
	organization_id: string;
	reason_code: string;
	reason_detail: string;
	rehire_eligible: boolean;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface OffboardingCaseSqlRow {
	completed_at: Date | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string;
	id: string;
	organization_id: string;
	started_at: Date;
	status: string;
	termination_id: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function mapOnboardingCaseSql(
	row: OnboardingCaseSqlRow,
): Result<OnboardingCase> {
	return mapOnboardingCase({
		id: row.id,
		organizationId: row.organization_id,
		employmentId: row.employment_id,
		employeeId: row.employee_id,
		status: row.status,
		sourceOfferId: row.source_offer_id,
		startedAt: row.started_at,
		completedAt: row.completed_at,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapProbationSql(row: ProbationSqlRow): Result<ProbationReview> {
	return mapProbation({
		id: row.id,
		organizationId: row.organization_id,
		employmentId: row.employment_id,
		employeeId: row.employee_id,
		status: row.status,
		startsOn: row.starts_on,
		endsOn: row.ends_on,
		outcome: row.outcome,
		outcomeActorId: row.outcome_actor_id,
		outcomeRecordedOn: row.outcome_recorded_on,
		lastExtensionReason: row.last_extension_reason,
		lastExtensionEvidenceReference: row.last_extension_evidence_reference,
		outcomeReason: row.outcome_reason,
		outcomeEvidenceReference: row.outcome_evidence_reference,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapProbationAssessmentSql(
	row: ProbationAssessmentSqlRow,
): Result<ProbationAssessment> {
	return mapProbationAssessment({
		id: row.id,
		organizationId: row.organization_id,
		probationReviewId: row.probation_review_id,
		employmentId: row.employment_id,
		employeeId: row.employee_id,
		reviewedOn: row.reviewed_on,
		reason: row.reason,
		evidenceReference: row.evidence_reference,
		actorUserId: row.actor_user_id,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapConfirmationSql(
	row: ConfirmationSqlRow,
): Result<EmploymentConfirmation> {
	return mapConfirmation({
		id: row.id,
		organizationId: row.organization_id,
		employmentId: row.employment_id,
		employeeId: row.employee_id,
		confirmedOn: row.confirmed_on,
		confirmedBy: row.confirmed_by,
		evidenceNote: row.evidence_note,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapMovementSql(row: MovementSqlRow): Result<EmploymentMovement> {
	return mapMovement({
		id: row.id,
		organizationId: row.organization_id,
		employmentId: row.employment_id,
		employeeId: row.employee_id,
		movementKind: row.movement_kind,
		fromAssignmentId: row.from_assignment_id,
		toAssignmentId: row.to_assignment_id,
		fromPositionId: row.from_position_id,
		toPositionId: row.to_position_id,
		effectiveOn: row.effective_on,
		reason: row.reason,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapTerminationSql(row: TerminationSqlRow): Result<Termination> {
	return mapTermination({
		id: row.id,
		organizationId: row.organization_id,
		employmentId: row.employment_id,
		employeeId: row.employee_id,
		status: row.status,
		reasonCode: row.reason_code,
		reasonDetail: row.reason_detail,
		effectiveOn: row.effective_on,
		approvedAt: row.approved_at,
		approvedBy: row.approved_by,
		rehireEligible: row.rehire_eligible,
		finalizedAt: row.finalized_at,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapOffboardingCaseSql(
	row: OffboardingCaseSqlRow,
): Result<OffboardingCase> {
	return mapOffboardingCase({
		id: row.id,
		organizationId: row.organization_id,
		employmentId: row.employment_id,
		employeeId: row.employee_id,
		terminationId: row.termination_id,
		status: row.status,
		startedAt: row.started_at,
		completedAt: row.completed_at,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

export const drizzleLifecycleMethods: DrizzleLifecycleMethods &
	ThisType<LifecycleHost & DrizzleLifecycleMethods> = {
	async getOnboardingCase(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrOnboardingCase)
				.where(
					and(
						eq(hrOnboardingCase.organizationId, input.organizationId),
						eq(hrOnboardingCase.id, input.onboardingCaseId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapOnboardingCase(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load onboarding case");
		}
	},

	async findOnboardingByStartIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrOnboardingCase)
				.where(
					and(
						eq(hrOnboardingCase.organizationId, input.organizationId),
						eq(hrOnboardingCase.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapOnboardingCase(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				onboardingCase: mapped.data,
				startRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find onboarding by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async startOnboarding(record, _ports, meta) {
		const existing = await this.findOnboardingByStartIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.startRequestFingerprint !== record.startRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return errorResult.ok(existing.data.onboardingCase);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const activeCheck = assertEmploymentActiveForOnboarding(
			employment.data.status,
		);
		if (!activeCheck.ok) {
			return activeCheck;
		}

		const caseId = randomUUID();
		const brandedCaseId = parseHumanResourcesOnboardingCaseId(caseId);
		if (!brandedCaseId.ok) {
			return brandedCaseId;
		}
		const orientationId = randomUUID();
		const brandedOrientationId =
			parseHumanResourcesOnboardingOrientationId(orientationId);
		if (!brandedOrientationId.ok) {
			return brandedOrientationId;
		}
		const equipmentHandoffId = randomUUID();
		const brandedEquipmentHandoffId =
			parseHumanResourcesOnboardingEquipmentHandoffId(equipmentHandoffId);
		if (!brandedEquipmentHandoffId.ok) {
			return brandedEquipmentHandoffId;
		}
		const accessHandoffId = randomUUID();
		const brandedAccessHandoffId =
			parseHumanResourcesOnboardingAccessHandoffId(accessHandoffId);
		if (!brandedAccessHandoffId.ok) {
			return brandedAccessHandoffId;
		}
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_onboarding_case",
			entityId: brandedCaseId.data,
			action: "CREATE",
			reasonCode: "ONBOARDING_STARTED",
			newValue: {
				employmentId: record.employmentId,
				status: "in_progress",
				taskCount: record.tasks.length,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const taskRows = record.tasks.map((task) => ({
			id: randomUUID(),
			code: task.code.trim(),
			title: task.title.trim(),
			mandatory: task.mandatory,
		}));
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_onboarding_case",
			entityId: brandedCaseId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH employment AS (
							SELECT id, organization_id, employee_id, status
							FROM hr_employment
							WHERE id = ${record.employmentId}
								AND organization_id = ${record.organizationId}
								AND status = 'active'
						),
						offer_ok AS (
							SELECT 1 AS ok
							WHERE ${record.sourceOfferId}::uuid IS NULL
							UNION ALL
							SELECT 1
							FROM hr_employment_offer offer
							WHERE offer.id = ${record.sourceOfferId}
								AND offer.organization_id = ${record.organizationId}
						),
						mutated AS (
							INSERT INTO hr_onboarding_case (
								id, organization_id, employment_id, employee_id, status,
								source_offer_id, started_at, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedCaseId.data}, employment.organization_id, employment.id,
								employment.employee_id, 'in_progress', ${record.sourceOfferId},
								now(), ${record.idempotencyKey}, ${record.startRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							FROM employment
							WHERE EXISTS (SELECT 1 FROM offer_ok)
								AND NOT EXISTS (
									SELECT 1 FROM hr_onboarding_case open_case
									WHERE open_case.organization_id = employment.organization_id
										AND open_case.employment_id = employment.id
										AND open_case.status = 'in_progress'
								)
							RETURNING *
						),
						tasks AS (
							INSERT INTO hr_onboarding_task (
								id, organization_id, case_id, code, title, mandatory, status,
								version, created_by, updated_by
							)
							SELECT
								task.id::uuid, mutated.organization_id, mutated.id, task.code,
								task.title, task.mandatory, 'pending', 1, ${record.createdBy},
								${record.createdBy}
							FROM mutated
							CROSS JOIN jsonb_to_recordset(${JSON.stringify(taskRows)}::jsonb)
								AS task(id text, code text, title text, mandatory boolean)
							RETURNING id
						),
						orientation AS (
							INSERT INTO hr_onboarding_orientation (
								id, organization_id, onboarding_case_id, employment_id, status,
								version, created_by, updated_by
							)
							SELECT
								${brandedOrientationId.data}, organization_id, id, employment_id,
								'pending', 1, ${record.createdBy}, ${record.createdBy}
							FROM mutated
							RETURNING id
						),
						equipment_handoff AS (
							INSERT INTO hr_onboarding_equipment_handoff (
								id, organization_id, onboarding_case_id, employment_id, status,
								version, created_by, updated_by
							)
							SELECT
								${brandedEquipmentHandoffId.data}, organization_id, id, employment_id,
								'pending', 1, ${record.createdBy}, ${record.createdBy}
							FROM mutated
							RETURNING id
						),
						access_handoff AS (
							INSERT INTO hr_onboarding_access_handoff (
								id, organization_id, onboarding_case_id, employment_id, status,
								version, created_by, updated_by
							)
							SELECT
								${brandedAccessHandoffId.data}, organization_id, id, employment_id,
								'pending', 1, ${record.createdBy}, ${record.createdBy}
							FROM mutated
							RETURNING id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, tasks, orientation, equipment_handoff,
							access_handoff, audited, outboxed
						WHERE EXISTS (SELECT 1 FROM tasks)
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to start onboarding for employment");
			}
			return mapOnboardingCaseSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findOnboardingByStartIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.startRequestFingerprint !==
						record.startRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return errorResult.ok(replay.data.onboardingCase);
				}
			}
			return mapPersistenceFailure(error, "Failed to start onboarding");
		}
	},

	async completeOnboardingTask(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_onboarding_task",
			entityId: input.taskId,
			action: "UPDATE",
			reasonCode: "ONBOARDING_TASK_COMPLETED",
			oldValue: { version: input.expectedVersion },
			newValue: { status: input.newStatus, version: nextVersion },
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH task_row AS (
							SELECT *
							FROM hr_onboarding_task
							WHERE id = ${input.taskId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'pending'
						),
						case_row AS (
							SELECT c.*
							FROM hr_onboarding_case c
							INNER JOIN task_row t ON t.case_id = c.id
							WHERE c.organization_id = ${input.organizationId}
								AND c.status = 'in_progress'
						),
						mutated AS (
							UPDATE hr_onboarding_task task
							SET status = ${input.newStatus},
								completed_at = now(),
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM case_row
							WHERE task.id = ${input.taskId}
								AND task.organization_id = ${input.organizationId}
								AND task.version = ${input.expectedVersion}
								AND ${input.newStatus} IN ('completed', 'waived')
							RETURNING task.case_id, task.organization_id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Onboarding task",
				});
			}
			const caseId = parseHumanResourcesOnboardingCaseId(row.case_id);
			if (!caseId.ok) {
				return caseId;
			}
			return this.getOnboardingCase({
				organizationId: input.organizationId,
				onboardingCaseId: caseId.data,
			}).then((result) => {
				if (!result.ok) {
					return result;
				}
				if (result.data === null) {
					return notFound("Onboarding case not found");
				}
				return errorResult.ok(result.data);
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to complete onboarding task");
		}
	},

	async completeOnboarding(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_onboarding_case",
			entityId: input.onboardingCaseId,
			action: "UPDATE",
			reasonCode: "ONBOARDING_COMPLETED",
			oldValue: { status: "in_progress", version: input.expectedVersion },
			newValue: { status: "completed", version: nextVersion },
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_onboarding_case",
			entityId: input.onboardingCaseId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH case_row AS (
							SELECT *
							FROM hr_onboarding_case
							WHERE id = ${input.onboardingCaseId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'in_progress'
						),
						ready AS (
							SELECT 1 AS ok
							FROM case_row
							WHERE NOT EXISTS (
								SELECT 1
								FROM hr_onboarding_task task
								WHERE task.case_id = case_row.id
									AND task.organization_id = case_row.organization_id
									AND task.mandatory = true
									AND task.status NOT IN ('completed', 'waived')
							)
							AND EXISTS (
								SELECT 1
								FROM hr_onboarding_orientation orientation
								WHERE orientation.onboarding_case_id = case_row.id
									AND orientation.organization_id = case_row.organization_id
									AND orientation.status = 'acknowledged'
							)
							AND EXISTS (
								SELECT 1
								FROM hr_onboarding_equipment_handoff equipment
								WHERE equipment.onboarding_case_id = case_row.id
									AND equipment.organization_id = case_row.organization_id
									AND equipment.status = 'handed_over'
							)
							AND EXISTS (
								SELECT 1
								FROM hr_onboarding_access_handoff access_handoff
								WHERE access_handoff.onboarding_case_id = case_row.id
									AND access_handoff.organization_id = case_row.organization_id
									AND access_handoff.status = 'granted'
							)
						),
						mutated AS (
							UPDATE hr_onboarding_case c
							SET status = 'completed',
								completed_at = now(),
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM ready
							WHERE c.id = ${input.onboardingCaseId}
								AND c.organization_id = ${input.organizationId}
								AND c.version = ${input.expectedVersion}
							RETURNING c.*
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return diagnoseOnboardingCompletionFailure(this, {
					organizationId: input.organizationId,
					onboardingCaseId: input.onboardingCaseId,
				});
			}
			return mapOnboardingCaseSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to complete onboarding");
		}
	},

	async getOnboardingOrientationByCase(input) {
		try {
			const caseRow = await this.getOnboardingCase({
				organizationId: input.organizationId,
				onboardingCaseId: input.onboardingCaseId,
			});
			if (!caseRow.ok) {
				return caseRow;
			}
			if (caseRow.data === null) {
				return notFound("Onboarding case not found");
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrOnboardingOrientation)
				.where(
					and(
						eq(hrOnboardingOrientation.organizationId, input.organizationId),
						eq(
							hrOnboardingOrientation.onboardingCaseId,
							input.onboardingCaseId,
						),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapOnboardingOrientation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get onboarding orientation",
			);
		}
	},

	async getOnboardingEquipmentHandoffByCase(input) {
		try {
			const caseRow = await this.getOnboardingCase({
				organizationId: input.organizationId,
				onboardingCaseId: input.onboardingCaseId,
			});
			if (!caseRow.ok) {
				return caseRow;
			}
			if (caseRow.data === null) {
				return notFound("Onboarding case not found");
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrOnboardingEquipmentHandoff)
				.where(
					and(
						eq(
							hrOnboardingEquipmentHandoff.organizationId,
							input.organizationId,
						),
						eq(
							hrOnboardingEquipmentHandoff.onboardingCaseId,
							input.onboardingCaseId,
						),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapOnboardingEquipmentHandoff(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get onboarding equipment handoff",
			);
		}
	},

	async getOnboardingAccessHandoffByCase(input) {
		try {
			const caseRow = await this.getOnboardingCase({
				organizationId: input.organizationId,
				onboardingCaseId: input.onboardingCaseId,
			});
			if (!caseRow.ok) {
				return caseRow;
			}
			if (caseRow.data === null) {
				return notFound("Onboarding case not found");
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrOnboardingAccessHandoff)
				.where(
					and(
						eq(hrOnboardingAccessHandoff.organizationId, input.organizationId),
						eq(
							hrOnboardingAccessHandoff.onboardingCaseId,
							input.onboardingCaseId,
						),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapOnboardingAccessHandoff(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get onboarding access handoff",
			);
		}
	},

	async recordOnboardingOrientation(input, _ports, meta) {
		const orientationRows = await afendaDatabase.client
			.select()
			.from(hrOnboardingOrientation)
			.where(
				and(
					eq(hrOnboardingOrientation.organizationId, input.organizationId),
					eq(hrOnboardingOrientation.id, input.orientationId),
				),
			)
			.limit(1);
		const [orientation] = orientationRows;
		if (!orientation) {
			return notFound("Onboarding orientation not found");
		}
		const orientationCaseId = parseHumanResourcesOnboardingCaseId(
			orientation.onboardingCaseId,
		);
		if (!orientationCaseId.ok) {
			return orientationCaseId;
		}
		const onboardingCase = await this.getOnboardingCase({
			organizationId: input.organizationId,
			onboardingCaseId: orientationCaseId.data,
		});
		if (!onboardingCase.ok) {
			return onboardingCase;
		}
		if (onboardingCase.data === null) {
			return notFound("Onboarding case not found");
		}
		const caseActive = assertOnboardingCaseInProgress(
			onboardingCase.data.status,
		);
		if (!caseActive.ok) {
			return caseActive;
		}
		const versionCheck = assertExpectedVersion(
			orientation.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const parsedStatus = onboardingOrientationStatusSchema.safeParse(
			orientation.status,
		);
		if (!parsedStatus.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		const transition = assertOnboardingOrientationStatusTransition(
			parsedStatus.data,
			"acknowledged",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_onboarding_orientation",
			entityId: input.orientationId,
			action: "UPDATE",
			reasonCode: "ONBOARDING_ORIENTATION_ACKNOWLEDGED",
			oldValue: { status: orientation.status, version: input.expectedVersion },
			newValue: {
				status: "acknowledged",
				acknowledgedOn: input.acknowledgedOn,
				version: nextVersion,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_onboarding_orientation o
							SET status = 'acknowledged',
								acknowledged_on = ${input.acknowledgedOn},
								notes = ${input.notes},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM hr_onboarding_case c
							WHERE o.id = ${input.orientationId}
								AND o.organization_id = ${input.organizationId}
								AND o.version = ${input.expectedVersion}
								AND o.status = 'pending'
								AND c.id = o.onboarding_case_id
								AND c.organization_id = o.organization_id
								AND c.status = 'in_progress'
							RETURNING o.onboarding_case_id, o.organization_id
						),
						task_completed AS (
							UPDATE hr_onboarding_task t
							SET status = 'completed',
								completed_at = now(),
								version = t.version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM mutated
							WHERE t.case_id = mutated.onboarding_case_id
								AND t.organization_id = mutated.organization_id
								AND t.code = ${ONBOARDING_TASK_CODE_ORIENTATION}
								AND t.status = 'pending'
							RETURNING t.id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Onboarding orientation",
				});
			}
			const caseId = parseHumanResourcesOnboardingCaseId(
				row.onboarding_case_id,
			);
			if (!caseId.ok) {
				return caseId;
			}
			const loaded = await this.getOnboardingCase({
				organizationId: input.organizationId,
				onboardingCaseId: caseId.data,
			});
			if (!loaded.ok) {
				return loaded;
			}
			if (loaded.data === null) {
				return notFound("Onboarding case not found");
			}
			return errorResult.ok(loaded.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record onboarding orientation",
			);
		}
	},

	async recordOnboardingEquipmentHandoff(input, _ports, meta) {
		const equipmentRows = await afendaDatabase.client
			.select()
			.from(hrOnboardingEquipmentHandoff)
			.where(
				and(
					eq(hrOnboardingEquipmentHandoff.organizationId, input.organizationId),
					eq(hrOnboardingEquipmentHandoff.id, input.equipmentHandoffId),
				),
			)
			.limit(1);
		const [equipmentHandoff] = equipmentRows;
		if (!equipmentHandoff) {
			return notFound("Onboarding equipment handoff not found");
		}
		const equipmentCaseId = parseHumanResourcesOnboardingCaseId(
			equipmentHandoff.onboardingCaseId,
		);
		if (!equipmentCaseId.ok) {
			return equipmentCaseId;
		}
		const onboardingCase = await this.getOnboardingCase({
			organizationId: input.organizationId,
			onboardingCaseId: equipmentCaseId.data,
		});
		if (!onboardingCase.ok) {
			return onboardingCase;
		}
		if (onboardingCase.data === null) {
			return notFound("Onboarding case not found");
		}
		const caseActive = assertOnboardingCaseInProgress(
			onboardingCase.data.status,
		);
		if (!caseActive.ok) {
			return caseActive;
		}
		const versionCheck = assertExpectedVersion(
			equipmentHandoff.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const parsedStatus = onboardingEquipmentHandoffStatusSchema.safeParse(
			equipmentHandoff.status,
		);
		if (!parsedStatus.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		const transition = assertOnboardingEquipmentHandoffStatusTransition(
			parsedStatus.data,
			"handed_over",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_onboarding_equipment_handoff",
			entityId: input.equipmentHandoffId,
			action: "UPDATE",
			reasonCode: "ONBOARDING_EQUIPMENT_HANDED_OVER",
			oldValue: {
				status: equipmentHandoff.status,
				version: input.expectedVersion,
			},
			newValue: {
				status: "handed_over",
				handedOverOn: input.handedOverOn,
				version: nextVersion,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_onboarding_equipment_handoff e
							SET status = 'handed_over',
								handed_over_on = ${input.handedOverOn},
								summary = ${input.summary},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM hr_onboarding_case c
							WHERE e.id = ${input.equipmentHandoffId}
								AND e.organization_id = ${input.organizationId}
								AND e.version = ${input.expectedVersion}
								AND e.status = 'pending'
								AND c.id = e.onboarding_case_id
								AND c.organization_id = e.organization_id
								AND c.status = 'in_progress'
							RETURNING e.onboarding_case_id, e.organization_id
						),
						task_completed AS (
							UPDATE hr_onboarding_task t
							SET status = 'completed',
								completed_at = now(),
								version = t.version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM mutated
							WHERE t.case_id = mutated.onboarding_case_id
								AND t.organization_id = mutated.organization_id
								AND t.code = ${ONBOARDING_TASK_CODE_EQUIPMENT_HANDOFF}
								AND t.status = 'pending'
							RETURNING t.id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Onboarding equipment handoff",
				});
			}
			const caseId = parseHumanResourcesOnboardingCaseId(
				row.onboarding_case_id,
			);
			if (!caseId.ok) {
				return caseId;
			}
			const loaded = await this.getOnboardingCase({
				organizationId: input.organizationId,
				onboardingCaseId: caseId.data,
			});
			if (!loaded.ok) {
				return loaded;
			}
			if (loaded.data === null) {
				return notFound("Onboarding case not found");
			}
			return errorResult.ok(loaded.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record onboarding equipment handoff",
			);
		}
	},

	async recordOnboardingAccessHandoff(input, _ports, meta) {
		const accessRows = await afendaDatabase.client
			.select()
			.from(hrOnboardingAccessHandoff)
			.where(
				and(
					eq(hrOnboardingAccessHandoff.organizationId, input.organizationId),
					eq(hrOnboardingAccessHandoff.id, input.accessHandoffId),
				),
			)
			.limit(1);
		const [accessHandoff] = accessRows;
		if (!accessHandoff) {
			return notFound("Onboarding access handoff not found");
		}
		const accessCaseId = parseHumanResourcesOnboardingCaseId(
			accessHandoff.onboardingCaseId,
		);
		if (!accessCaseId.ok) {
			return accessCaseId;
		}
		const onboardingCase = await this.getOnboardingCase({
			organizationId: input.organizationId,
			onboardingCaseId: accessCaseId.data,
		});
		if (!onboardingCase.ok) {
			return onboardingCase;
		}
		if (onboardingCase.data === null) {
			return notFound("Onboarding case not found");
		}
		const caseActive = assertOnboardingCaseInProgress(
			onboardingCase.data.status,
		);
		if (!caseActive.ok) {
			return caseActive;
		}
		const versionCheck = assertExpectedVersion(
			accessHandoff.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const parsedStatus = onboardingAccessHandoffStatusSchema.safeParse(
			accessHandoff.status,
		);
		if (!parsedStatus.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		const transition = assertOnboardingAccessHandoffStatusTransition(
			parsedStatus.data,
			"granted",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_onboarding_access_handoff",
			entityId: input.accessHandoffId,
			action: "UPDATE",
			reasonCode: "ONBOARDING_ACCESS_GRANTED",
			oldValue: {
				status: accessHandoff.status,
				version: input.expectedVersion,
			},
			newValue: {
				status: "granted",
				grantedOn: input.grantedOn,
				version: nextVersion,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_onboarding_access_handoff a
							SET status = 'granted',
								granted_on = ${input.grantedOn},
								summary = ${input.summary},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM hr_onboarding_case c
							WHERE a.id = ${input.accessHandoffId}
								AND a.organization_id = ${input.organizationId}
								AND a.version = ${input.expectedVersion}
								AND a.status = 'pending'
								AND c.id = a.onboarding_case_id
								AND c.organization_id = a.organization_id
								AND c.status = 'in_progress'
							RETURNING a.onboarding_case_id, a.organization_id
						),
						task_completed AS (
							UPDATE hr_onboarding_task t
							SET status = 'completed',
								completed_at = now(),
								version = t.version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM mutated
							WHERE t.case_id = mutated.onboarding_case_id
								AND t.organization_id = mutated.organization_id
								AND t.code = ${ONBOARDING_TASK_CODE_ACCESS_HANDOFF}
								AND t.status = 'pending'
							RETURNING t.id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Onboarding access handoff",
				});
			}
			const caseId = parseHumanResourcesOnboardingCaseId(
				row.onboarding_case_id,
			);
			if (!caseId.ok) {
				return caseId;
			}
			const loaded = await this.getOnboardingCase({
				organizationId: input.organizationId,
				onboardingCaseId: caseId.data,
			});
			if (!loaded.ok) {
				return loaded;
			}
			if (loaded.data === null) {
				return notFound("Onboarding case not found");
			}
			return errorResult.ok(loaded.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record onboarding access handoff",
			);
		}
	},

	async getProbationReview(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrProbationReview)
				.where(
					and(
						eq(hrProbationReview.organizationId, input.organizationId),
						eq(hrProbationReview.id, input.probationReviewId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapProbation(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load probation review");
		}
	},

	async listProbationReviewsByEmployment(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrProbationReview)
				.where(
					and(
						eq(hrProbationReview.organizationId, input.organizationId),
						eq(hrProbationReview.employmentId, input.employmentId),
					),
				)
				.orderBy(desc(hrProbationReview.createdAt));
			const mapped: ProbationReview[] = [];
			for (const row of rows) {
				const result = mapProbation(row);
				if (!result.ok) {
					return result;
				}
				mapped.push(result.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list probation reviews by employment",
			);
		}
	},

	async listProbationAssessments(input) {
		const probation = await this.getProbationReview({
			organizationId: input.organizationId,
			probationReviewId: input.probationReviewId,
		});
		if (!probation.ok) {
			return probation;
		}
		if (probation.data === null) {
			return notFound("Probation review not found");
		}
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrProbationAssessment)
				.where(
					and(
						eq(hrProbationAssessment.organizationId, input.organizationId),
						eq(
							hrProbationAssessment.probationReviewId,
							input.probationReviewId,
						),
					),
				)
				.orderBy(asc(hrProbationAssessment.reviewedOn));
			const mapped: ProbationAssessment[] = [];
			for (const row of rows) {
				const result = mapProbationAssessment(row);
				if (!result.ok) {
					return result;
				}
				mapped.push(result.data);
			}
			return errorResult.ok(mapped);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list probation assessments",
			);
		}
	},

	async findProbationByOpenIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrProbationReview)
				.where(
					and(
						eq(hrProbationReview.organizationId, input.organizationId),
						eq(hrProbationReview.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapProbation(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				probationReview: mapped.data,
				openRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find probation by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, validation, kernel audit preparation, and guarded persistence in one atomic command path.
	async openProbation(record, _ports, meta) {
		const existing = await this.findProbationByOpenIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.openRequestFingerprint !== record.openRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return errorResult.ok(existing.data.probationReview);
		}
		const dateCheck = assertProbationDateRange({
			startsOn: record.startsOn,
			endsOn: record.endsOn,
		});
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesProbationReviewId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_probation_review",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "PROBATION_OPENED",
			newValue: {
				employmentId: record.employmentId,
				startsOn: record.startsOn,
				endsOn: record.endsOn,
				status: "open",
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH employment AS (
							SELECT id, organization_id, employee_id
							FROM hr_employment
							WHERE id = ${record.employmentId}
								AND organization_id = ${record.organizationId}
								AND status = 'active'
						),
						mutated AS (
							INSERT INTO hr_probation_review (
								id, organization_id, employment_id, employee_id, status,
								starts_on, ends_on, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, employment.organization_id, employment.id,
								employment.employee_id, 'open', ${record.startsOn}, ${record.endsOn},
								${record.idempotencyKey}, ${record.openRequestFingerprint}, 1,
								${record.createdBy}, ${record.createdBy}
							FROM employment
							WHERE NOT EXISTS (
								SELECT 1 FROM hr_probation_review open_review
								WHERE open_review.organization_id = employment.organization_id
									AND open_review.employment_id = employment.id
									AND open_review.status = 'open'
							)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to open probation for employment");
			}
			return mapProbationSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findProbationByOpenIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.openRequestFingerprint !== record.openRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return errorResult.ok(replay.data.probationReview);
				}
			}
			return mapPersistenceFailure(error, "Failed to open probation");
		}
	},

	async extendProbation(input, _ports, meta) {
		const existing = await this.getProbationReview({
			organizationId: input.organizationId,
			probationReviewId: input.probationReviewId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Probation review not found");
		}
		const openCheck = assertProbationOpen(existing.data.status);
		if (!openCheck.ok) {
			return openCheck;
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const extension = assertProbationExtension({
			currentEndsOn: existing.data.endsOn,
			newEndsOn: input.newEndsOn,
		});
		if (!extension.ok) {
			return extension;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_probation_review",
			entityId: input.probationReviewId,
			action: "UPDATE",
			reasonCode: "PROBATION_EXTENDED",
			oldValue: {
				endsOn: existing.data.endsOn,
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: {
				endsOn: input.newEndsOn,
				status: existing.data.status,
				version: nextVersion,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const extendPayloadJson = eventPayloadJson(
			withOptionalEvidenceReference(
				{
					...probationReviewEventBase(
						existing.data,
						input.actorUserId,
						meta.correlationId,
					),
					newEndsOn: input.newEndsOn,
					reason: input.reason,
				},
				input.evidenceReference,
			),
		);
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_probation_review
							SET ends_on = ${input.newEndsOn},
								last_extension_reason = ${input.reason},
								last_extension_evidence_reference = ${input.evidenceReference},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.probationReviewId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'open'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${extendPayloadJson}::jsonb,
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Probation review",
				});
			}
			return mapProbationSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to extend probation");
		}
	},

	async recordProbationAssessment(input, _ports, meta) {
		const existing = await this.getProbationReview({
			organizationId: input.organizationId,
			probationReviewId: input.probationReviewId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Probation review not found");
		}
		const openCheck = assertProbationOpen(existing.data.status);
		if (!openCheck.ok) {
			return openCheck;
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const reviewedOnCheck = assertProbationAssessmentReviewedOn({
			startsOn: existing.data.startsOn,
			endsOn: existing.data.endsOn,
			reviewedOn: input.reviewedOn,
		});
		if (!reviewedOnCheck.ok) {
			return reviewedOnCheck;
		}

		const assessmentId = randomUUID();
		const brandedAssessmentId =
			parseHumanResourcesProbationAssessmentId(assessmentId);
		if (!brandedAssessmentId.ok) {
			return brandedAssessmentId;
		}
		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_probation_assessment",
			entityId: brandedAssessmentId.data,
			action: "CREATE",
			reasonCode: "PROBATION_ASSESSMENT_RECORDED",
			newValue: {
				probationReviewId: input.probationReviewId,
				reviewedOn: input.reviewedOn,
				version: 1,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const assessmentPayloadJson = eventPayloadJson(
			withOptionalEvidenceReference(
				{
					...probationReviewEventBase(
						existing.data,
						input.actorUserId,
						meta.correlationId,
					),
					probationReviewId: input.probationReviewId,
					reviewedOn: input.reviewedOn,
					reason: input.reason,
				},
				input.evidenceReference,
			),
		);
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH review AS (
							UPDATE hr_probation_review
							SET version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.probationReviewId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'open'
							RETURNING *
						),
						mutated AS (
							INSERT INTO hr_probation_assessment (
								id, organization_id, probation_review_id, employment_id, employee_id,
								reviewed_on, reason, evidence_reference, actor_user_id, version,
								created_by, updated_by
							)
							SELECT
								${brandedAssessmentId.data}, review.organization_id, review.id,
								review.employment_id, review.employee_id, ${input.reviewedOn},
								${input.reason}, ${input.evidenceReference}, ${input.actorUserId}, 1,
								${input.actorUserId}, ${input.actorUserId}
							FROM review
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_PROBATION_ASSESSMENT_RECORDED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${assessmentPayloadJson}::jsonb,
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Probation review",
				});
			}
			return mapProbationAssessmentSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record probation assessment",
			);
		}
	},

	async recordProbationOutcome(input, _ports, meta) {
		const existing = await this.getProbationReview({
			organizationId: input.organizationId,
			probationReviewId: input.probationReviewId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Probation review not found");
		}
		const openCheck = assertProbationOpen(existing.data.status);
		if (!openCheck.ok) {
			return openCheck;
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const outcomeDateCheck = assertProbationOutcomeRecordedOn({
			startsOn: existing.data.startsOn,
			endsOn: existing.data.endsOn,
			outcomeRecordedOn: input.concludedOn,
		});
		if (!outcomeDateCheck.ok) {
			return outcomeDateCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_probation_review",
			entityId: input.probationReviewId,
			action: "UPDATE",
			reasonCode: "PROBATION_OUTCOME_RECORDED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: {
				status: "closed",
				outcome: input.outcome,
				outcomeRecordedOn: input.concludedOn,
				version: nextVersion,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const outcomePayloadJson = eventPayloadJson(
			withOptionalEvidenceReference(
				{
					...probationReviewEventBase(
						existing.data,
						input.actorUserId,
						meta.correlationId,
					),
					outcome: input.outcome,
					outcomeRecordedOn: input.concludedOn,
					reason: input.reason,
				},
				input.evidenceReference,
			),
		);
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_probation_review
							SET status = 'closed',
								outcome = ${input.outcome},
								outcome_actor_id = ${input.actorUserId},
								outcome_recorded_on = ${input.concludedOn},
								outcome_reason = ${input.reason},
								outcome_evidence_reference = ${input.evidenceReference},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.probationReviewId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'open'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${outcomePayloadJson}::jsonb,
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Probation review",
				});
			}
			return mapProbationSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to record probation outcome");
		}
	},

	async getEmploymentConfirmation(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrEmploymentConfirmation)
				.where(
					and(
						eq(hrEmploymentConfirmation.organizationId, input.organizationId),
						eq(hrEmploymentConfirmation.id, input.employmentConfirmationId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapConfirmation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load employment confirmation",
			);
		}
	},

	async findConfirmationByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrEmploymentConfirmation)
				.where(
					and(
						eq(hrEmploymentConfirmation.organizationId, input.organizationId),
						eq(
							hrEmploymentConfirmation.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapConfirmation(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				employmentConfirmation: mapped.data,
				confirmRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find confirmation by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async confirmEmployment(record, _ports, meta) {
		const existing = await this.findConfirmationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.confirmRequestFingerprint !==
				record.confirmRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return errorResult.ok(existing.data.employmentConfirmation);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const probationRows = await afendaDatabase.client
			.select()
			.from(hrProbationReview)
			.where(
				and(
					eq(hrProbationReview.organizationId, record.organizationId),
					eq(hrProbationReview.employmentId, record.employmentId),
				),
			)
			.orderBy(desc(hrProbationReview.createdAt));
		const hasAnyProbation = probationRows.length > 0;
		const latestClosed =
			probationRows.find((row) => row.status === "closed") ?? null;
		const probationGate = assertLatestProbationPassed({
			hasAnyProbation,
			latestClosedProbation: latestClosed
				? { outcome: latestClosed.outcome }
				: null,
		});
		if (!probationGate.ok) {
			return probationGate;
		}
		const confirmationDateCheck = assertConfirmationEffectiveOn({
			confirmedOn: record.confirmedOn,
			latestPassedOutcomeRecordedOn:
				latestClosed?.outcome === "passed"
					? latestClosed.outcomeRecordedOn
					: null,
		});
		if (!confirmationDateCheck.ok) {
			return confirmationDateCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesEmploymentConfirmationId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employment_confirmation",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "EMPLOYMENT_CONFIRMED",
			newValue: {
				employmentId: record.employmentId,
				confirmedOn: record.confirmedOn,
				version: 1,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const confirmPayloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_employee",
			entityId: employment.data.employeeId,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
			confirmedOn: record.confirmedOn,
			evidenceNote: record.evidenceNote,
		});
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH employment AS (
							SELECT id, organization_id, employee_id
							FROM hr_employment
							WHERE id = ${record.employmentId}
								AND organization_id = ${record.organizationId}
						),
						mutated AS (
							INSERT INTO hr_employment_confirmation (
								id, organization_id, employment_id, employee_id, confirmed_on,
								confirmed_by, evidence_note, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, employment.organization_id, employment.id,
								employment.employee_id, ${record.confirmedOn}, ${record.createdBy},
								${record.evidenceNote}, ${record.idempotencyKey},
								${record.confirmRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							FROM employment
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${confirmPayloadJson}::jsonb,
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to confirm employment");
			}
			return mapConfirmationSql(row);
		} catch (error) {
			if (
				isCreateIdempotencyUniqueViolation(error) ||
				isPostgresUniqueViolation(error)
			) {
				const replay = await this.findConfirmationByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.confirmRequestFingerprint !==
						record.confirmRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return errorResult.ok(replay.data.employmentConfirmation);
				}
				return conflict("Employment already has a confirmation");
			}
			return mapPersistenceFailure(error, "Failed to confirm employment");
		}
	},

	async findTransferByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrEmploymentMovement)
				.where(
					and(
						eq(hrEmploymentMovement.organizationId, input.organizationId),
						eq(hrEmploymentMovement.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapMovement(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				employmentMovement: mapped.data,
				transferRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find transfer by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async transferAssignment(input, _ports, meta) {
		const fingerprint = fingerprintTransfer({
			employmentId: input.employmentId,
			toPositionId: input.toPositionId,
			organizationDimensionIds: Object.values(input.organizationDimensions).map(
				(dimension) => dimension.id,
			),
			effectiveOn: input.effectiveOn,
			reason: input.reason.trim(),
		});

		const existing = await this.findTransferByIdempotencyKey({
			organizationId: input.organizationId,
			idempotencyKey: input.idempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (existing.data.transferRequestFingerprint !== fingerprint) {
				return conflict("Idempotency key reused with different payload");
			}
			return errorResult.ok(existing.data.employmentMovement);
		}

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

		const toPosition = await this.getPositionById({
			organizationId: input.organizationId,
			positionId: input.toPositionId,
		});
		if (!toPosition.ok) {
			return toPosition;
		}
		if (toPosition.data === null) {
			return notFound(
				"Position not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const activeCheck = assertActivePosition(toPosition.data.status);
		if (!activeCheck.ok) {
			return activeCheck;
		}
		if (toPosition.data.id === openAssignment.data.positionId) {
			return conflict("Target position must differ from current position");
		}
		const dateCheck = assertValidDateRange(
			openAssignment.data.startsOn,
			input.effectiveOn,
		);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const employment = await this.getEmploymentById({
			organizationId: input.organizationId,
			employmentId: input.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const siblings = await this.listAssignmentsByEmployment({
			organizationId: input.organizationId,
			employmentId: input.employmentId,
		});
		if (!siblings.ok) {
			return siblings;
		}

		const transferRanges = assertTransferAssignmentRanges({
			openAssignment: openAssignment.data,
			effectiveOn: input.effectiveOn,
			employmentStartsOn: employment.data.startsOn,
			employmentEndsOn: employment.data.endsOn,
			siblings: siblings.data,
		});
		if (!transferRanges.ok) {
			return transferRanges;
		}

		const currentAssignment = openAssignment.data;
		const newAssignmentId = randomUUID();
		const brandedAssignmentId =
			parseHumanResourcesAssignmentId(newAssignmentId);
		if (!brandedAssignmentId.ok) {
			return brandedAssignmentId;
		}
		const movementId = randomUUID();
		const brandedMovementId =
			parseHumanResourcesEmploymentMovementId(movementId);
		if (!brandedMovementId.ok) {
			return brandedMovementId;
		}
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employment_movement",
			entityId: brandedMovementId.data,
			action: "CREATE",
			reasonCode: "EMPLOYMENT_ASSIGNMENT_TRANSFERRED",
			newValue: {
				employmentId: input.employmentId,
				fromPositionId: currentAssignment.positionId,
				toPositionId: input.toPositionId,
				effectiveOn: input.effectiveOn,
				version: 1,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextAssignmentVersion = currentAssignment.version + 1;

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH employment AS (
							SELECT id, organization_id, employee_id
							FROM hr_employment
							WHERE id = ${input.employmentId}
								AND organization_id = ${input.organizationId}
						),
						position AS (
							SELECT id
							FROM hr_position
							WHERE id = ${input.toPositionId}
								AND organization_id = ${input.organizationId}
								AND status = 'active'
						),
						legal_entity AS (
							SELECT id, key, name
							FROM md_organization_dimension
							WHERE id = ${input.organizationDimensions.legal_entity.id}
								AND organization_id = ${input.organizationId}
								AND kind = 'legal_entity'
								AND key = ${input.organizationDimensions.legal_entity.key}
								AND effective_from <= ${input.effectiveOn}
								AND (effective_to IS NULL OR effective_to >= ${input.effectiveOn})
						),
						business_unit AS (
							SELECT id, key, name
							FROM md_organization_dimension
							WHERE id = ${input.organizationDimensions.business_unit.id}
								AND organization_id = ${input.organizationId}
								AND kind = 'business_unit'
								AND key = ${input.organizationDimensions.business_unit.key}
								AND effective_from <= ${input.effectiveOn}
								AND (effective_to IS NULL OR effective_to >= ${input.effectiveOn})
						),
						location AS (
							SELECT id, key, name
							FROM md_organization_dimension
							WHERE id = ${input.organizationDimensions.location.id}
								AND organization_id = ${input.organizationId}
								AND kind = 'location'
								AND key = ${input.organizationDimensions.location.key}
								AND effective_from <= ${input.effectiveOn}
								AND (effective_to IS NULL OR effective_to >= ${input.effectiveOn})
						),
						cost_centre AS (
							SELECT id, key, name
							FROM md_organization_dimension
							WHERE id = ${input.organizationDimensions.cost_centre.id}
								AND organization_id = ${input.organizationId}
								AND kind = 'cost_centre'
								AND key = ${input.organizationDimensions.cost_centre.key}
								AND effective_from <= ${input.effectiveOn}
								AND (effective_to IS NULL OR effective_to >= ${input.effectiveOn})
						),
						project AS (
							SELECT id, key, name
							FROM md_organization_dimension
							WHERE id = ${input.organizationDimensions.project.id}
								AND organization_id = ${input.organizationId}
								AND kind = 'project'
								AND key = ${input.organizationDimensions.project.key}
								AND effective_from <= ${input.effectiveOn}
								AND (effective_to IS NULL OR effective_to >= ${input.effectiveOn})
						),
						ended AS (
							UPDATE hr_work_assignment
							SET ends_on = ${previousIsoDate(input.effectiveOn)},
								successor_assignment_id = ${brandedAssignmentId.data},
								transfer_movement_id = ${brandedMovementId.data},
								version = ${nextAssignmentVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${currentAssignment.id}
								AND organization_id = ${input.organizationId}
								AND version = ${currentAssignment.version}
								AND ends_on IS NULL
							RETURNING *
						),
						created_assignment AS (
							INSERT INTO hr_work_assignment (
								id, organization_id, employment_id, employee_id, position_id,
								legal_entity_dimension_id, legal_entity_key_snapshot, legal_entity_name_snapshot,
								business_unit_dimension_id, business_unit_key_snapshot, business_unit_name_snapshot,
								location_dimension_id, location_key_snapshot, location_name_snapshot,
								cost_centre_dimension_id, cost_centre_key_snapshot, cost_centre_name_snapshot,
								project_dimension_id, project_key_snapshot, project_name_snapshot,
								predecessor_assignment_id, successor_assignment_id, transfer_movement_id,
								manager_employee_id_snapshot, work_calendar_id_snapshot,
								starts_on, ends_on, version, created_by, updated_by
							)
							SELECT
								${brandedAssignmentId.data}, employment.organization_id, employment.id,
								employment.employee_id, position.id,
								legal_entity.id, legal_entity.key, legal_entity.name,
								business_unit.id, business_unit.key, business_unit.name,
								location.id, location.key, location.name,
								cost_centre.id, cost_centre.key, cost_centre.name,
								project.id, project.key, project.name,
								ended.id, NULL, ${brandedMovementId.data},
								${input.managerEmployeeIdSnapshot}, ${input.workCalendarIdSnapshot},
								${input.effectiveOn}, NULL, 1,
								${input.actorUserId}, ${input.actorUserId}
							FROM employment, position, legal_entity, business_unit, location,
								cost_centre, project, ended
							RETURNING *
						),
						mutated AS (
							INSERT INTO hr_employment_movement (
								id, organization_id, employment_id, employee_id, movement_kind,
								from_assignment_id, to_assignment_id, from_position_id,
								to_position_id, effective_on, reason, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedMovementId.data}, employment.organization_id, employment.id,
								employment.employee_id, 'transfer', ended.id, created_assignment.id,
								ended.position_id, position.id, ${input.effectiveOn},
								${input.reason}, ${input.idempotencyKey}, ${fingerprint}, 1,
								${input.actorUserId}, ${input.actorUserId}
							FROM employment, position, ended, created_assignment
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'hr_employee',
									'entityId', employee_id::text,
									'actorId', ${input.actorUserId}::text,
									'correlationId', ${meta.correlationId}::text,
									'effectiveOn', effective_on::text
								),
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to transfer assignment");
			}
			return mapMovementSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findTransferByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (replay.data.transferRequestFingerprint !== fingerprint) {
						return conflict("Idempotency key reused with different payload");
					}
					return errorResult.ok(replay.data.employmentMovement);
				}
			}
			return mapPersistenceFailure(error, "Failed to transfer assignment");
		}
	},

	async getTermination(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrTermination)
				.where(
					and(
						eq(hrTermination.organizationId, input.organizationId),
						eq(hrTermination.id, input.terminationId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapTermination(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load termination");
		}
	},

	async findTerminationByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrTermination)
				.where(
					and(
						eq(hrTermination.organizationId, input.organizationId),
						eq(hrTermination.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapTermination(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				termination: mapped.data,
				terminationRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find termination by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async proposeTermination(record, _ports, meta) {
		const existing = await this.findTerminationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.terminationRequestFingerprint !==
				record.terminationRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return errorResult.ok(existing.data.termination);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const effectiveCheck = assertTerminationEffectiveDate({
			effectiveOn: record.effectiveOn,
			employmentStartsOn: employment.data.startsOn,
		});
		if (!effectiveCheck.ok) {
			return effectiveCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesTerminationId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_termination",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "TERMINATION_PROPOSED",
			newValue: {
				employmentId: record.employmentId,
				status: "draft",
				reasonCode: record.reasonCode,
				effectiveOn: record.effectiveOn,
				rehireEligible: record.rehireEligible,
				version: 1,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH employment AS (
							SELECT id, organization_id, employee_id, starts_on
							FROM hr_employment
							WHERE id = ${record.employmentId}
								AND organization_id = ${record.organizationId}
						),
						mutated AS (
							INSERT INTO hr_termination (
								id, organization_id, employment_id, employee_id, status,
								reason_code, reason_detail, effective_on, rehire_eligible,
								create_idempotency_key, create_request_fingerprint, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, employment.organization_id, employment.id,
								employment.employee_id, 'draft', ${record.reasonCode},
								${record.reasonDetail}, ${record.effectiveOn},
								${record.rehireEligible}, ${record.idempotencyKey},
								${record.terminationRequestFingerprint}, 1,
								${record.createdBy}, ${record.createdBy}
							FROM employment
							WHERE ${record.effectiveOn}::date >= employment.starts_on
								AND NOT EXISTS (
									SELECT 1 FROM hr_termination draft
									WHERE draft.organization_id = employment.organization_id
										AND draft.employment_id = employment.id
										AND draft.status = 'draft'
								)
								AND NOT EXISTS (
									SELECT 1 FROM hr_termination finalized
									WHERE finalized.organization_id = employment.organization_id
										AND finalized.employment_id = employment.id
										AND finalized.status = 'finalized'
								)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to propose termination");
			}
			return mapTerminationSql(row);
		} catch (error) {
			if (
				isCreateIdempotencyUniqueViolation(error) ||
				isPostgresUniqueViolation(error)
			) {
				const replay = await this.findTerminationByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.terminationRequestFingerprint !==
						record.terminationRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return errorResult.ok(replay.data.termination);
				}
				return conflict("Employment already has an open termination draft");
			}
			return mapPersistenceFailure(error, "Failed to propose termination");
		}
	},

	async approveTermination(record, _ports, meta) {
		const existing = await this.getTermination({
			organizationId: record.organizationId,
			terminationId: record.terminationId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Termination not found");
		}
		const approvable = assertTerminationApprovable({
			status: existing.data.status,
			approvedAt: existing.data.approvedAt,
		});
		if (!approvable.ok) {
			return approvable;
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextVersion = record.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_termination",
			entityId: record.terminationId,
			action: "UPDATE",
			reasonCode: "TERMINATION_APPROVED",
			oldValue: { approved: false, version: record.expectedVersion },
			newValue: { approved: true, version: nextVersion },
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_termination
							SET approved_at = now(),
								approved_by = ${record.actorUserId},
								version = ${nextVersion},
								updated_by = ${record.actorUserId},
								updated_at = now()
							WHERE id = ${record.terminationId}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND status = 'draft'
								AND approved_at IS NULL
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Termination",
				});
			}
			return mapTerminationSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to approve termination");
		}
	},

	async finalizeTermination(record, _ports, meta) {
		const existing = await this.getTermination({
			organizationId: record.organizationId,
			terminationId: record.terminationId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Termination not found");
		}
		const finalizable = assertTerminationFinalizable({
			status: existing.data.status,
			approvedAt: existing.data.approvedAt,
			approvedBy: existing.data.approvedBy,
		});
		if (!finalizable.ok) {
			return finalizable;
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: existing.data.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const effectiveCheck = assertTerminationEffectiveDate({
			effectiveOn: existing.data.effectiveOn,
			employmentStartsOn: employment.data.startsOn,
		});
		if (!effectiveCheck.ok) {
			return effectiveCheck;
		}

		const currentEmployment = employment.data;
		const terminationEmploymentId = existing.data.employmentId;
		const nextTerminationVersion = record.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_termination",
			entityId: record.terminationId,
			action: "UPDATE",
			reasonCode: "TERMINATION_FINALIZED",
			oldValue: {
				status: existing.data.status,
				version: record.expectedVersion,
			},
			newValue: {
				status: "finalized",
				effectiveOn: existing.data.effectiveOn,
				version: nextTerminationVersion,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const historyId = randomUUID();
		const nextEmploymentVersion = currentEmployment.version + 1;
		const expectedEmploymentVersion = currentEmployment.version;
		const fromEmploymentStatus = currentEmployment.status;

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH employment AS (
							SELECT id, organization_id, employee_id, starts_on, status, version
							FROM hr_employment
							WHERE id = ${terminationEmploymentId}
								AND organization_id = ${record.organizationId}
								AND version = ${expectedEmploymentVersion}
						),
						mutated AS (
							UPDATE hr_termination t
							SET status = 'finalized',
								finalized_at = now(),
								version = ${nextTerminationVersion},
								updated_by = ${record.actorUserId},
								updated_at = now()
							FROM employment
							WHERE t.id = ${record.terminationId}
								AND t.organization_id = ${record.organizationId}
								AND t.version = ${record.expectedVersion}
								AND t.status = 'draft'
								AND t.approved_at IS NOT NULL
								AND t.approved_by IS NOT NULL
								AND t.employment_id = employment.id
								AND t.effective_on::date >= employment.starts_on
								AND NOT EXISTS (
									SELECT 1 FROM hr_termination finalized
									WHERE finalized.organization_id = t.organization_id
										AND finalized.employment_id = t.employment_id
										AND finalized.status = 'finalized'
										AND finalized.id <> t.id
								)
							RETURNING t.*
						),
						employment_updated AS (
							UPDATE hr_employment e
							SET status = 'terminated',
								ends_on = mutated.effective_on,
								version = ${nextEmploymentVersion},
								updated_by = ${record.actorUserId},
								updated_at = now()
							FROM mutated
							WHERE e.id = mutated.employment_id
								AND e.organization_id = mutated.organization_id
								AND e.version = ${expectedEmploymentVersion}
							RETURNING e.*
						),
						history_inserted AS (
							INSERT INTO hr_employment_status_history (
								id, organization_id, employment_id, employee_id, from_status, to_status,
								starts_on_snapshot, ends_on_snapshot, effective_on, change_kind,
								reason, evidence_reference, correlation_id, actor_user_id
							)
							SELECT
								${historyId}, employment_updated.organization_id, employment_updated.id,
								employment_updated.employee_id, ${fromEmploymentStatus},
								'terminated', employment_updated.starts_on, mutated.effective_on,
								mutated.effective_on, 'lifecycle', mutated.reason_code,
								mutated.reason_detail, ${meta.correlationId}, ${record.actorUserId}
							FROM employment_updated
							CROSS JOIN mutated
							RETURNING id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT},
								'human-resources', ${meta.correlationId}, ${record.actorUserId},
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'hr_employee',
									'entityId', employee_id::text,
									'actorId', ${record.actorUserId}::text,
									'correlationId', ${meta.correlationId}::text,
									'effectiveOn', effective_on::text
								),
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, employment_updated, history_inserted, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to finalize termination");
			}
			return mapTerminationSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Employment already has a finalized termination");
			}
			return mapPersistenceFailure(error, "Failed to finalize termination");
		}
	},

	async getOffboardingCase(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrOffboardingCase)
				.where(
					and(
						eq(hrOffboardingCase.organizationId, input.organizationId),
						eq(hrOffboardingCase.id, input.offboardingCaseId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapOffboardingCase(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load offboarding case");
		}
	},

	async findOffboardingByStartIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrOffboardingCase)
				.where(
					and(
						eq(hrOffboardingCase.organizationId, input.organizationId),
						eq(hrOffboardingCase.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapOffboardingCase(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
				offboardingCase: mapped.data,
				startRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find offboarding by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async startOffboarding(record, _ports, meta) {
		const existing = await this.findOffboardingByStartIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.startRequestFingerprint !== record.startRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return errorResult.ok(existing.data.offboardingCase);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const finalized = await afendaDatabase.client
			.select()
			.from(hrTermination)
			.where(
				and(
					eq(hrTermination.organizationId, record.organizationId),
					eq(hrTermination.employmentId, record.employmentId),
					eq(hrTermination.status, "finalized"),
				),
			)
			.limit(1);
		const eligibility = assertEmploymentForOffboarding({
			employmentStatus: employment.data.status,
			hasTermination: finalized.length > 0 || record.terminationId !== null,
		});
		if (!eligibility.ok) {
			return eligibility;
		}

		const caseId = randomUUID();
		const brandedCaseId = parseHumanResourcesOffboardingCaseId(caseId);
		if (!brandedCaseId.ok) {
			return brandedCaseId;
		}
		const clearanceId = randomUUID();
		const brandedClearanceId = parseHumanResourcesClearanceId(clearanceId);
		if (!brandedClearanceId.ok) {
			return brandedClearanceId;
		}
		const accessRevocationId = randomUUID();
		const brandedAccessRevocationId =
			parseHumanResourcesOffboardingAccessRevocationId(accessRevocationId);
		if (!brandedAccessRevocationId.ok) {
			return brandedAccessRevocationId;
		}
		const payrollHandoffId = randomUUID();
		const brandedPayrollHandoffId =
			parseHumanResourcesOffboardingPayrollHandoffId(payrollHandoffId);
		if (!brandedPayrollHandoffId.ok) {
			return brandedPayrollHandoffId;
		}
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_offboarding_case",
			entityId: brandedCaseId.data,
			action: "CREATE",
			reasonCode: "OFFBOARDING_STARTED",
			newValue: {
				employmentId: record.employmentId,
				terminationId: record.terminationId,
				status: "in_progress",
				taskCount: record.tasks.length,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const taskRows = record.tasks.map((task) => ({
			id: randomUUID(),
			code: task.code.trim(),
			title: task.title.trim(),
			mandatory: task.mandatory,
		}));
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_offboarding_case",
			entityId: brandedCaseId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH employment AS (
							SELECT id, organization_id, employee_id, status
							FROM hr_employment
							WHERE id = ${record.employmentId}
								AND organization_id = ${record.organizationId}
						),
						termination_ok AS (
							SELECT 1 AS ok
							WHERE ${record.terminationId}::uuid IS NULL
								AND (
									(SELECT status FROM employment) IN ('notice', 'terminated')
									OR EXISTS (
										SELECT 1 FROM hr_termination t
										WHERE t.organization_id = ${record.organizationId}
											AND t.employment_id = ${record.employmentId}
											AND t.status = 'finalized'
									)
								)
							UNION ALL
							SELECT 1
							FROM hr_termination t
							WHERE t.id = ${record.terminationId}
								AND t.organization_id = ${record.organizationId}
								AND t.employment_id = ${record.employmentId}
								AND t.status = 'finalized'
						),
						mutated AS (
							INSERT INTO hr_offboarding_case (
								id, organization_id, employment_id, employee_id, termination_id,
								status, started_at, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedCaseId.data}, employment.organization_id, employment.id,
								employment.employee_id, ${record.terminationId}, 'in_progress', now(),
								${record.idempotencyKey}, ${record.startRequestFingerprint}, 1,
								${record.createdBy}, ${record.createdBy}
							FROM employment
							WHERE EXISTS (SELECT 1 FROM termination_ok)
								AND NOT EXISTS (
									SELECT 1 FROM hr_offboarding_case open_case
									WHERE open_case.organization_id = employment.organization_id
										AND open_case.employment_id = employment.id
										AND open_case.status = 'in_progress'
								)
							RETURNING *
						),
						tasks AS (
							INSERT INTO hr_offboarding_task (
								id, organization_id, case_id, code, title, mandatory, status,
								version, created_by, updated_by
							)
							SELECT
								task.id::uuid, mutated.organization_id, mutated.id, task.code,
								task.title, task.mandatory, 'pending', 1, ${record.createdBy},
								${record.createdBy}
							FROM mutated
							CROSS JOIN jsonb_to_recordset(${JSON.stringify(taskRows)}::jsonb)
								AS task(id text, code text, title text, mandatory boolean)
							RETURNING id
						),
						clearance AS (
							INSERT INTO hr_clearance (
								id, organization_id, offboarding_case_id, employment_id, status,
								version, created_by, updated_by
							)
							SELECT
								${brandedClearanceId.data}, organization_id, id, employment_id,
								'pending', 1, ${record.createdBy}, ${record.createdBy}
							FROM mutated
							RETURNING id
						),
						access_revocation AS (
							INSERT INTO hr_offboarding_access_revocation (
								id, organization_id, offboarding_case_id, employment_id, status,
								version, created_by, updated_by
							)
							SELECT
								${brandedAccessRevocationId.data}, organization_id, id, employment_id,
								'pending', 1, ${record.createdBy}, ${record.createdBy}
							FROM mutated
							RETURNING id
						),
						payroll_handoff AS (
							INSERT INTO hr_offboarding_payroll_handoff (
								id, organization_id, offboarding_case_id, employment_id, status,
								version, created_by, updated_by
							)
							SELECT
								${brandedPayrollHandoffId.data}, organization_id, id, employment_id,
								'pending', 1, ${record.createdBy}, ${record.createdBy}
							FROM mutated
							RETURNING id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, tasks, clearance, access_revocation, payroll_handoff, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to start offboarding for employment");
			}
			return mapOffboardingCaseSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findOffboardingByStartIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.startRequestFingerprint !==
						record.startRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return errorResult.ok(replay.data.offboardingCase);
				}
			}
			return mapPersistenceFailure(error, "Failed to start offboarding");
		}
	},

	async completeOffboardingTask(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_offboarding_task",
			entityId: input.taskId,
			action: "UPDATE",
			reasonCode: "OFFBOARDING_TASK_COMPLETED",
			oldValue: { status: "pending", version: input.expectedVersion },
			newValue: { status: input.newStatus, version: nextVersion },
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
							WITH mutated AS (
								UPDATE hr_offboarding_task task
								SET status = ${input.newStatus},
									completed_at = now(),
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								FROM hr_offboarding_case c
								WHERE task.id = ${input.taskId}
									AND task.organization_id = ${input.organizationId}
									AND task.version = ${input.expectedVersion}
									AND task.status = 'pending'
									AND ${input.newStatus} IN ('completed', 'waived')
									AND c.id = task.case_id
									AND c.organization_id = task.organization_id
									AND c.status = 'in_progress'
								RETURNING task.case_id
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
								SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Offboarding task",
				});
			}
			const caseId = parseHumanResourcesOffboardingCaseId(row.case_id);
			if (!caseId.ok) {
				return caseId;
			}
			const loaded = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: caseId.data,
			});
			if (!loaded.ok) {
				return loaded;
			}
			if (loaded.data === null) {
				return notFound("Offboarding case not found");
			}
			return errorResult.ok(loaded.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to complete offboarding task",
			);
		}
	},

	async recordExitInterview(input, _ports, meta) {
		if (input.notes === null || input.notes.trim().length === 0) {
			return invalidInput("Exit interview notes are required");
		}
		const notes = input.notes.trim();
		const offboardingCase = await this.getOffboardingCase({
			organizationId: input.organizationId,
			offboardingCaseId: input.offboardingCaseId,
		});
		if (!offboardingCase.ok) {
			return offboardingCase;
		}
		if (offboardingCase.data === null) {
			return notFound("Offboarding case not found");
		}
		const caseActive = assertOffboardingCaseInProgress(
			offboardingCase.data.status,
		);
		if (!caseActive.ok) {
			return caseActive;
		}

		const interviewId = randomUUID();
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_exit_interview",
			entityId: interviewId,
			action: "CREATE",
			reasonCode: "EXIT_INTERVIEW_RECORDED",
			newValue: {
				offboardingCaseId: input.offboardingCaseId,
				conductedOn: input.conductedOn,
				version: 1,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
							WITH case_row AS (
								SELECT *
								FROM hr_offboarding_case
								WHERE id = ${input.offboardingCaseId}
									AND organization_id = ${input.organizationId}
									AND status = 'in_progress'
							),
							mutated AS (
								INSERT INTO hr_exit_interview (
									id, organization_id, offboarding_case_id, employment_id,
									conducted_on, notes, version, created_by, updated_by
								)
								SELECT
									${interviewId}, organization_id, id, employment_id,
									${input.conductedOn}, ${notes}, 1,
									${input.actorUserId}, ${input.actorUserId}
								FROM case_row
								RETURNING offboarding_case_id AS case_id
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
								SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to record exit interview");
			}
			return errorResult.ok(offboardingCase.data);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Exit interview already recorded for this case");
			}
			return mapPersistenceFailure(error, "Failed to record exit interview");
		}
	},

	async recordClearance(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_clearance",
			entityId: input.clearanceId,
			action: "UPDATE",
			reasonCode: "OFFBOARDING_CLEARANCE_COMPLETED",
			oldValue: { status: "pending", version: input.expectedVersion },
			newValue: {
				status: "cleared",
				clearedOn: input.clearedOn,
				version: nextVersion,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_clearance c
							SET status = 'cleared',
								cleared_on = ${input.clearedOn},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM hr_offboarding_case oc
							WHERE c.id = ${input.clearanceId}
								AND c.organization_id = ${input.organizationId}
								AND c.version = ${input.expectedVersion}
								AND c.status = 'pending'
								AND oc.id = c.offboarding_case_id
								AND oc.organization_id = c.organization_id
								AND oc.status = 'in_progress'
							RETURNING c.id, c.organization_id, c.offboarding_case_id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_CLEARANCE_COMPLETED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'hr_clearance',
									'entityId', id::text,
									'actorId', ${input.actorUserId}::text,
									'correlationId', ${meta.correlationId}::text
								),
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Clearance",
				});
			}
			const caseId = parseHumanResourcesOffboardingCaseId(
				row.offboarding_case_id,
			);
			if (!caseId.ok) {
				return caseId;
			}
			const loaded = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: caseId.data,
			});
			if (!loaded.ok) {
				return loaded;
			}
			if (loaded.data === null) {
				return notFound("Offboarding case not found");
			}
			return errorResult.ok(loaded.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to record clearance");
		}
	},

	async completeOffboarding(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_offboarding_case",
			entityId: input.offboardingCaseId,
			action: "UPDATE",
			reasonCode: "OFFBOARDING_COMPLETED",
			oldValue: { status: "in_progress", version: input.expectedVersion },
			newValue: { status: "completed", version: nextVersion },
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_offboarding_case",
			entityId: input.offboardingCaseId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH case_row AS (
							SELECT *
							FROM hr_offboarding_case
							WHERE id = ${input.offboardingCaseId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'in_progress'
						),
						ready AS (
							SELECT 1 AS ok
							FROM case_row
							WHERE NOT EXISTS (
								SELECT 1 FROM hr_offboarding_task task
								WHERE task.case_id = case_row.id
									AND task.organization_id = case_row.organization_id
									AND task.mandatory = true
									AND task.status NOT IN ('completed', 'waived')
							)
							AND EXISTS (
								SELECT 1 FROM hr_exit_interview ei
								WHERE ei.offboarding_case_id = case_row.id
									AND ei.organization_id = case_row.organization_id
							)
							AND EXISTS (
								SELECT 1 FROM hr_clearance cl
								WHERE cl.offboarding_case_id = case_row.id
									AND cl.organization_id = case_row.organization_id
									AND cl.status = 'cleared'
							)
							AND EXISTS (
								SELECT 1 FROM hr_offboarding_access_revocation ar
								WHERE ar.offboarding_case_id = case_row.id
									AND ar.organization_id = case_row.organization_id
									AND ar.status = 'revoked'
							)
							AND EXISTS (
								SELECT 1 FROM hr_offboarding_payroll_handoff ph
								WHERE ph.offboarding_case_id = case_row.id
									AND ph.organization_id = case_row.organization_id
									AND ph.status = 'ready'
							)
						),
						mutated AS (
							UPDATE hr_offboarding_case c
							SET status = 'completed',
								completed_at = now(),
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM ready
							WHERE c.id = ${input.offboardingCaseId}
								AND c.organization_id = ${input.organizationId}
								AND c.version = ${input.expectedVersion}
							RETURNING c.*
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				const existing = await this.getOffboardingCase({
					organizationId: input.organizationId,
					offboardingCaseId: input.offboardingCaseId,
				});
				if (!existing.ok) {
					return existing;
				}
				if (existing.data === null) {
					return notFound("Offboarding case not found");
				}
				return invalidState(
					"Offboarding cannot be completed until mandatory tasks, exit interview, clearance, access revocation, and payroll handoff are done",
				);
			}
			return mapOffboardingCaseSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to complete offboarding");
		}
	},

	async listOnboardingTasks(input) {
		try {
			const caseRow = await this.getOnboardingCase({
				organizationId: input.organizationId,
				onboardingCaseId: input.onboardingCaseId,
			});
			if (!caseRow.ok) {
				return caseRow;
			}
			if (caseRow.data === null) {
				return notFound("Onboarding case not found");
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrOnboardingTask)
				.where(
					and(
						eq(hrOnboardingTask.organizationId, input.organizationId),
						eq(hrOnboardingTask.caseId, input.onboardingCaseId),
					),
				)
				.orderBy(hrOnboardingTask.code);
			const tasks: OnboardingTask[] = [];
			for (const row of rows) {
				const mapped = mapOnboardingTask(row);
				if (!mapped.ok) {
					return mapped;
				}
				tasks.push(mapped.data);
			}
			return errorResult.ok(tasks);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list onboarding tasks");
		}
	},

	async getOnboardingTask(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrOnboardingTask)
				.where(
					and(
						eq(hrOnboardingTask.organizationId, input.organizationId),
						eq(hrOnboardingTask.id, input.taskId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapOnboardingTask(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get onboarding task");
		}
	},

	async listOffboardingTasks(input) {
		try {
			const caseRow = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: input.offboardingCaseId,
			});
			if (!caseRow.ok) {
				return caseRow;
			}
			if (caseRow.data === null) {
				return notFound("Offboarding case not found");
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrOffboardingTask)
				.where(
					and(
						eq(hrOffboardingTask.organizationId, input.organizationId),
						eq(hrOffboardingTask.caseId, input.offboardingCaseId),
					),
				)
				.orderBy(hrOffboardingTask.code);
			const tasks: OffboardingTask[] = [];
			for (const row of rows) {
				const mapped = mapOffboardingTask(row);
				if (!mapped.ok) {
					return mapped;
				}
				tasks.push(mapped.data);
			}
			return errorResult.ok(tasks);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list offboarding tasks");
		}
	},

	async getClearanceByOffboardingCase(input) {
		try {
			const caseRow = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: input.offboardingCaseId,
			});
			if (!caseRow.ok) {
				return caseRow;
			}
			if (caseRow.data === null) {
				return notFound("Offboarding case not found");
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrClearance)
				.where(
					and(
						eq(hrClearance.organizationId, input.organizationId),
						eq(hrClearance.offboardingCaseId, input.offboardingCaseId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapClearance(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get clearance");
		}
	},

	async getOffboardingAccessRevocationByCase(input) {
		try {
			const caseRow = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: input.offboardingCaseId,
			});
			if (!caseRow.ok) {
				return caseRow;
			}
			if (caseRow.data === null) {
				return notFound("Offboarding case not found");
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrOffboardingAccessRevocation)
				.where(
					and(
						eq(
							hrOffboardingAccessRevocation.organizationId,
							input.organizationId,
						),
						eq(
							hrOffboardingAccessRevocation.offboardingCaseId,
							input.offboardingCaseId,
						),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapOffboardingAccessRevocation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get offboarding access revocation",
			);
		}
	},

	async getOffboardingPayrollHandoffByCase(input) {
		try {
			const caseRow = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: input.offboardingCaseId,
			});
			if (!caseRow.ok) {
				return caseRow;
			}
			if (caseRow.data === null) {
				return notFound("Offboarding case not found");
			}
			const rows = await afendaDatabase.client
				.select()
				.from(hrOffboardingPayrollHandoff)
				.where(
					and(
						eq(
							hrOffboardingPayrollHandoff.organizationId,
							input.organizationId,
						),
						eq(
							hrOffboardingPayrollHandoff.offboardingCaseId,
							input.offboardingCaseId,
						),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapOffboardingPayrollHandoff(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get offboarding payroll handoff",
			);
		}
	},

	async recordOffboardingAccessRevocation(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_offboarding_access_revocation",
			entityId: input.accessRevocationId,
			action: "UPDATE",
			reasonCode: "OFFBOARDING_ACCESS_REVOKED",
			oldValue: { status: "pending", version: input.expectedVersion },
			newValue: {
				status: "revoked",
				revokedOn: input.revokedOn,
				version: nextVersion,
			},
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_offboarding_access_revocation ar
							SET status = 'revoked',
								revoked_on = ${input.revokedOn},
								summary = ${input.summary},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM hr_offboarding_case oc
							WHERE ar.id = ${input.accessRevocationId}
								AND ar.organization_id = ${input.organizationId}
								AND ar.version = ${input.expectedVersion}
								AND ar.status = 'pending'
								AND oc.id = ar.offboarding_case_id
								AND oc.organization_id = ar.organization_id
								AND oc.status = 'in_progress'
							RETURNING ar.offboarding_case_id, ar.organization_id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Offboarding access revocation",
				});
			}
			const caseId = parseHumanResourcesOffboardingCaseId(
				row.offboarding_case_id,
			);
			if (!caseId.ok) {
				return caseId;
			}
			const loaded = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: caseId.data,
			});
			if (!loaded.ok) {
				return loaded;
			}
			if (loaded.data === null) {
				return notFound("Offboarding case not found");
			}
			return errorResult.ok(loaded.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record offboarding access revocation",
			);
		}
	},

	async recordOffboardingPayrollHandoff(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
		const preparedLifecycleAudit = prepareLifecycleAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_offboarding_payroll_handoff",
			entityId: input.payrollHandoffId,
			action: "UPDATE",
			reasonCode: "OFFBOARDING_PAYROLL_HANDOFF_READY",
			oldValue: { status: "pending", version: input.expectedVersion },
			newValue: { status: "ready", version: nextVersion },
		});
		if (!preparedLifecycleAudit.ok) {
			return preparedLifecycleAudit;
		}
		const audit = preparedLifecycleAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_offboarding_payroll_handoff ph
							SET status = 'ready',
								ready_on = ${input.readyOn},
								summary = ${input.summary},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM hr_offboarding_case oc
							WHERE ph.id = ${input.payrollHandoffId}
								AND ph.organization_id = ${input.organizationId}
								AND ph.version = ${input.expectedVersion}
								AND ph.status = 'pending'
								AND oc.id = ph.offboarding_case_id
								AND oc.organization_id = ph.organization_id
								AND oc.status = 'in_progress'
							RETURNING ph.offboarding_case_id, ph.organization_id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Offboarding payroll handoff",
				});
			}
			const caseId = parseHumanResourcesOffboardingCaseId(
				row.offboarding_case_id,
			);
			if (!caseId.ok) {
				return caseId;
			}
			const loaded = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: caseId.data,
			});
			if (!loaded.ok) {
				return loaded;
			}
			if (loaded.data === null) {
				return notFound("Offboarding case not found");
			}
			return errorResult.ok(loaded.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record offboarding payroll handoff",
			);
		}
	},
};

export function attachDrizzleLifecycle(target: LifecycleHost): void {
	Object.assign(target, drizzleLifecycleMethods);
}
