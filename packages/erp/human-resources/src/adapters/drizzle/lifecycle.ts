import { randomUUID } from "node:crypto";

import {
	and,
	db,
	desc,
	eq,
	hrClearance,
	hrEmploymentConfirmation,
	hrEmploymentMovement,
	hrOffboardingCase,
	hrOffboardingTask,
	hrOnboardingCase,
	hrOnboardingTask,
	hrProbationReview,
	hrTermination,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
} from "@afenda/events/schemas";

import {
	parseHumanResourcesAssignmentId,
	parseHumanResourcesClearanceId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentConfirmationId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesEmploymentMovementId,
	parseHumanResourcesOffboardingCaseId,
	parseHumanResourcesOffboardingTaskId,
	parseHumanResourcesOfferId,
	parseHumanResourcesOnboardingCaseId,
	parseHumanResourcesOnboardingTaskId,
	parseHumanResourcesPositionId,
	parseHumanResourcesProbationReviewId,
	parseHumanResourcesTerminationId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	assertActivePosition,
	conflict,
	invalidInput,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import { assertValidDateRange } from "../../shared/employment-status";
import { fingerprintTransfer } from "../../shared/fingerprint";
import {
	assertEmploymentActiveForOnboarding,
	assertEmploymentForOffboarding,
	assertLatestProbationPassed,
	assertOffboardingCaseInProgress,
	assertProbationDateRange,
	assertProbationExtension,
	assertProbationOpen,
	assertTerminationEffectiveDate,
} from "../../shared/lifecycle-guards";
import type { ProbationOutcome } from "../../shared/lifecycle-status";
import {
	clearanceStatusSchema,
	lifecycleTaskStatusSchema,
	movementKindSchema,
	offboardingCaseStatusSchema,
	onboardingCaseStatusSchema,
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
	OffboardingCase,
	OffboardingTask,
	OnboardingCase,
	OnboardingTask,
	ProbationReview,
	Termination,
} from "../../types";

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

type LifecycleHost = {
	getEmploymentById: HumanResourcesStore["getEmploymentById"];
	getPositionById: HumanResourcesStore["getPositionById"];
	findOpenAssignmentByEmployment: HumanResourcesStore["findOpenAssignmentByEmployment"];
};

export type DrizzleLifecycleMethods = Pick<
	HumanResourcesStore,
	| "getOnboardingCase"
	| "findOnboardingByStartIdempotencyKey"
	| "startOnboarding"
	| "completeOnboardingTask"
	| "completeOnboarding"
	| "listOnboardingTasks"
	| "getProbationReview"
	| "findProbationByOpenIdempotencyKey"
	| "openProbation"
	| "extendProbation"
	| "recordProbationOutcome"
	| "getEmploymentConfirmation"
	| "findConfirmationByIdempotencyKey"
	| "confirmEmployment"
	| "findTransferByIdempotencyKey"
	| "transferAssignment"
	| "getTermination"
	| "findTerminationByIdempotencyKey"
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
>;

function mapOnboardingCase(
	row: typeof hrOnboardingCase.$inferSelect,
): Result<OnboardingCase> {
	const id = parseHumanResourcesOnboardingCaseId(row.id);
	if (!id.ok) return id;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const status = onboardingCaseStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid onboarding case status");
	}
	let sourceOfferId = null as OnboardingCase["sourceOfferId"];
	if (row.sourceOfferId !== null) {
		const offerId = parseHumanResourcesOfferId(row.sourceOfferId);
		if (!offerId.ok) return offerId;
		sourceOfferId = offerId.data;
	}
	return ok({
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
	if (!id.ok) return id;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const status = probationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid probation status");
	}
	let outcome: ProbationOutcome | null = null;
	if (row.outcome !== null) {
		const parsed = probationOutcomeSchema.safeParse(row.outcome);
		if (!parsed.success) {
			return fail("INTERNAL_ERROR", "Invalid probation outcome");
		}
		outcome = parsed.data;
	}
	return ok({
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
	if (!id.ok) return id;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	return ok({
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
	row: typeof hrEmploymentMovement.$inferSelect,
): Result<EmploymentMovement> {
	const id = parseHumanResourcesEmploymentMovementId(row.id);
	if (!id.ok) return id;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const fromAssignmentId = parseHumanResourcesAssignmentId(
		row.fromAssignmentId,
	);
	if (!fromAssignmentId.ok) return fromAssignmentId;
	const toAssignmentId = parseHumanResourcesAssignmentId(row.toAssignmentId);
	if (!toAssignmentId.ok) return toAssignmentId;
	const fromPositionId = parseHumanResourcesPositionId(row.fromPositionId);
	if (!fromPositionId.ok) return fromPositionId;
	const toPositionId = parseHumanResourcesPositionId(row.toPositionId);
	if (!toPositionId.ok) return toPositionId;
	const kind = movementKindSchema.safeParse(row.movementKind);
	if (!kind.success) {
		return fail("INTERNAL_ERROR", "Invalid movement kind");
	}
	return ok({
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
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapTermination(
	row: typeof hrTermination.$inferSelect,
): Result<Termination> {
	const id = parseHumanResourcesTerminationId(row.id);
	if (!id.ok) return id;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const status = terminationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid termination status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		status: status.data,
		reasonCode: row.reasonCode,
		reasonDetail: row.reasonDetail,
		effectiveOn: row.effectiveOn,
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
	if (!id.ok) return id;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const status = offboardingCaseStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid offboarding case status");
	}
	let terminationId = null as OffboardingCase["terminationId"];
	if (row.terminationId !== null) {
		const parsed = parseHumanResourcesTerminationId(row.terminationId);
		if (!parsed.ok) return parsed;
		terminationId = parsed.data;
	}
	return ok({
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
	if (!id.ok) return id;
	const caseId = parseHumanResourcesOnboardingCaseId(row.caseId);
	if (!caseId.ok) return caseId;
	const status = lifecycleTaskStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid onboarding task status");
	}
	return ok({
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
	if (!id.ok) return id;
	const caseId = parseHumanResourcesOffboardingCaseId(row.caseId);
	if (!caseId.ok) return caseId;
	const status = lifecycleTaskStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid offboarding task status");
	}
	return ok({
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
	if (!id.ok) return id;
	const offboardingCaseId = parseHumanResourcesOffboardingCaseId(
		row.offboardingCaseId,
	);
	if (!offboardingCaseId.ok) return offboardingCaseId;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const status = clearanceStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid clearance status");
	}
	return ok({
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

/** Raw Neon HTTP CTE rows use snake_case column names. */
type OnboardingCaseSqlRow = {
	id: string;
	organization_id: string;
	employment_id: string;
	employee_id: string;
	status: string;
	source_offer_id: string | null;
	started_at: Date;
	completed_at: Date | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type ProbationSqlRow = {
	id: string;
	organization_id: string;
	employment_id: string;
	employee_id: string;
	status: string;
	starts_on: string;
	ends_on: string;
	outcome: string | null;
	outcome_actor_id: string | null;
	outcome_recorded_on: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type ConfirmationSqlRow = {
	id: string;
	organization_id: string;
	employment_id: string;
	employee_id: string;
	confirmed_on: string;
	confirmed_by: string;
	evidence_note: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type MovementSqlRow = {
	id: string;
	organization_id: string;
	employment_id: string;
	employee_id: string;
	movement_kind: string;
	from_assignment_id: string;
	to_assignment_id: string;
	from_position_id: string;
	to_position_id: string;
	effective_on: string;
	reason: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type TerminationSqlRow = {
	id: string;
	organization_id: string;
	employment_id: string;
	employee_id: string;
	status: string;
	reason_code: string;
	reason_detail: string;
	effective_on: string;
	finalized_at: Date | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type OffboardingCaseSqlRow = {
	id: string;
	organization_id: string;
	employment_id: string;
	employee_id: string;
	termination_id: string | null;
	status: string;
	started_at: Date;
	completed_at: Date | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

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
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
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
			const rows = await db
				.select()
				.from(hrOnboardingCase)
				.where(
					and(
						eq(hrOnboardingCase.organizationId, input.organizationId),
						eq(hrOnboardingCase.id, input.onboardingCaseId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapOnboardingCase(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load onboarding case");
		}
	},

	async findOnboardingByStartIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrOnboardingCase)
				.where(
					and(
						eq(hrOnboardingCase.organizationId, input.organizationId),
						eq(hrOnboardingCase.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapOnboardingCase(row);
			if (!mapped.ok) return mapped;
			return ok({
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

	async startOnboarding(record, _ports, meta) {
		const existing = await this.findOnboardingByStartIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.startRequestFingerprint !== record.startRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(existing.data.onboardingCase);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) return employment;
		if (employment.data === null) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const activeCheck = assertEmploymentActiveForOnboarding(
			employment.data.status,
		);
		if (!activeCheck.ok) return activeCheck;

		const caseId = randomUUID();
		const brandedCaseId = parseHumanResourcesOnboardingCaseId(caseId);
		if (!brandedCaseId.ok) return brandedCaseId;
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
			const [rows] = await runNeonHttpTransaction<[OnboardingCaseSqlRow[]]>(
				(sqlTag) => [
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
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_onboarding_case', id, 'CREATE', '[]'::jsonb
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
						SELECT mutated.* FROM mutated, audited, outboxed
						WHERE EXISTS (SELECT 1 FROM tasks)
					`,
				],
			);
			const row = rows[0];
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
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.startRequestFingerprint !==
						record.startRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return ok(replay.data.onboardingCase);
				}
			}
			return mapPersistenceFailure(error, "Failed to start onboarding");
		}
	},

	async completeOnboardingTask(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					{
						case_id: string;
						organization_id: string;
					}[],
				]
			>((sqlTag) => [
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
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_onboarding_task', ${input.taskId}, 'UPDATE',
								'[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Onboarding task",
				});
			}
			const caseId = parseHumanResourcesOnboardingCaseId(row.case_id);
			if (!caseId.ok) return caseId;
			return this.getOnboardingCase({
				organizationId: input.organizationId,
				onboardingCaseId: caseId.data,
			}).then((result) => {
				if (!result.ok) return result;
				if (result.data === null) {
					return notFound("Onboarding case not found");
				}
				return ok(result.data);
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to complete onboarding task");
		}
	},

	async completeOnboarding(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
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
			const [rows] = await runNeonHttpTransaction<[OnboardingCaseSqlRow[]]>(
				(sqlTag) => [
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
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_onboarding_case', id, 'UPDATE', '[]'::jsonb
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
				],
			);
			const row = rows[0];
			if (!row) {
				const existing = await this.getOnboardingCase({
					organizationId: input.organizationId,
					onboardingCaseId: input.onboardingCaseId,
				});
				if (!existing.ok) return existing;
				if (existing.data === null) {
					return notFound("Onboarding case not found");
				}
				if (existing.data.status !== "in_progress") {
					return invalidState("Onboarding case must be in progress");
				}
				return invalidState("All mandatory tasks must be completed or waived");
			}
			return mapOnboardingCaseSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to complete onboarding");
		}
	},

	async getProbationReview(input) {
		try {
			const rows = await db
				.select()
				.from(hrProbationReview)
				.where(
					and(
						eq(hrProbationReview.organizationId, input.organizationId),
						eq(hrProbationReview.id, input.probationReviewId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapProbation(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load probation review");
		}
	},

	async findProbationByOpenIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrProbationReview)
				.where(
					and(
						eq(hrProbationReview.organizationId, input.organizationId),
						eq(hrProbationReview.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapProbation(row);
			if (!mapped.ok) return mapped;
			return ok({
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

	async openProbation(record, _ports, meta) {
		const existing = await this.findProbationByOpenIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.openRequestFingerprint !== record.openRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(existing.data.probationReview);
		}
		const dateCheck = assertProbationDateRange({
			startsOn: record.startsOn,
			endsOn: record.endsOn,
		});
		if (!dateCheck.ok) return dateCheck;

		const id = randomUUID();
		const brandedId = parseHumanResourcesProbationReviewId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[ProbationSqlRow[]]>(
				(sqlTag) => [
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
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_probation_review', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
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
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.openRequestFingerprint !== record.openRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return ok(replay.data.probationReview);
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
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Probation review not found");
		}
		const openCheck = assertProbationOpen(existing.data.status);
		if (!openCheck.ok) return openCheck;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const extension = assertProbationExtension({
			currentEndsOn: existing.data.endsOn,
			newEndsOn: input.newEndsOn,
		});
		if (!extension.ok) return extension;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[ProbationSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_probation_review
							SET ends_on = ${input.newEndsOn},
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
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_probation_review', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
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

	async recordProbationOutcome(input, _ports, meta) {
		const existing = await this.getProbationReview({
			organizationId: input.organizationId,
			probationReviewId: input.probationReviewId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Probation review not found");
		}
		const openCheck = assertProbationOpen(existing.data.status);
		if (!openCheck.ok) return openCheck;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[ProbationSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_probation_review
							SET status = 'closed',
								outcome = ${input.outcome},
								outcome_actor_id = ${input.actorUserId},
								outcome_recorded_on = ${input.concludedOn},
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
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_probation_review', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
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
			const rows = await db
				.select()
				.from(hrEmploymentConfirmation)
				.where(
					and(
						eq(hrEmploymentConfirmation.organizationId, input.organizationId),
						eq(hrEmploymentConfirmation.id, input.employmentConfirmationId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
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
			const rows = await db
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
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapConfirmation(row);
			if (!mapped.ok) return mapped;
			return ok({
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

	async confirmEmployment(record, _ports, meta) {
		const existing = await this.findConfirmationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.confirmRequestFingerprint !==
				record.confirmRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(existing.data.employmentConfirmation);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) return employment;
		if (employment.data === null) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const probationRows = await db
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
		if (!probationGate.ok) return probationGate;

		const id = randomUUID();
		const brandedId = parseHumanResourcesEmploymentConfirmationId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[ConfirmationSqlRow[]]>(
				(sqlTag) => [
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
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_employment_confirmation', id, 'CREATE',
								'[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
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
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.confirmRequestFingerprint !==
						record.confirmRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return ok(replay.data.employmentConfirmation);
				}
				return conflict("Employment already has a confirmation");
			}
			return mapPersistenceFailure(error, "Failed to confirm employment");
		}
	},

	async findTransferByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmploymentMovement)
				.where(
					and(
						eq(hrEmploymentMovement.organizationId, input.organizationId),
						eq(hrEmploymentMovement.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapMovement(row);
			if (!mapped.ok) return mapped;
			return ok({
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

	async transferAssignment(input, _ports, meta) {
		const openAssignment = await this.findOpenAssignmentByEmployment({
			organizationId: input.organizationId,
			employmentId: input.employmentId,
		});
		if (!openAssignment.ok) return openAssignment;
		if (openAssignment.data === null) {
			return notFound("Open assignment not found");
		}

		const fingerprint = fingerprintTransfer({
			employmentId: input.employmentId,
			fromPositionId: openAssignment.data.positionId,
			toPositionId: input.toPositionId,
			effectiveOn: input.effectiveOn,
		});

		const existing = await this.findTransferByIdempotencyKey({
			organizationId: input.organizationId,
			idempotencyKey: input.idempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (existing.data.transferRequestFingerprint !== fingerprint) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(existing.data.employmentMovement);
		}

		const toPosition = await this.getPositionById({
			organizationId: input.organizationId,
			positionId: input.toPositionId,
		});
		if (!toPosition.ok) return toPosition;
		if (toPosition.data === null) {
			return notFound(
				"Position not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const activeCheck = assertActivePosition(toPosition.data.status);
		if (!activeCheck.ok) return activeCheck;
		if (toPosition.data.id === openAssignment.data.positionId) {
			return conflict("Target position must differ from current position");
		}
		const dateCheck = assertValidDateRange(
			openAssignment.data.startsOn,
			input.effectiveOn,
		);
		if (!dateCheck.ok) return dateCheck;

		const currentAssignment = openAssignment.data;
		const newAssignmentId = randomUUID();
		const brandedAssignmentId =
			parseHumanResourcesAssignmentId(newAssignmentId);
		if (!brandedAssignmentId.ok) return brandedAssignmentId;
		const movementId = randomUUID();
		const brandedMovementId =
			parseHumanResourcesEmploymentMovementId(movementId);
		if (!brandedMovementId.ok) return brandedMovementId;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextAssignmentVersion = currentAssignment.version + 1;

		try {
			const [rows] = await runNeonHttpTransaction<[MovementSqlRow[]]>(
				(sqlTag) => [
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
						ended AS (
							UPDATE hr_work_assignment
							SET ends_on = ${input.effectiveOn},
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
								starts_on, ends_on, version, created_by, updated_by
							)
							SELECT
								${brandedAssignmentId.data}, employment.organization_id, employment.id,
								employment.employee_id, position.id, ${input.effectiveOn}, NULL, 1,
								${input.actorUserId}, ${input.actorUserId}
							FROM employment, position, ended
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
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employment_movement', id, 'CREATE', '[]'::jsonb
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
									'correlationId', ${meta.correlationId}::text
								),
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
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
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (replay.data.transferRequestFingerprint !== fingerprint) {
						return conflict("Idempotency key reused with different payload");
					}
					return ok(replay.data.employmentMovement);
				}
			}
			return mapPersistenceFailure(error, "Failed to transfer assignment");
		}
	},

	async getTermination(input) {
		try {
			const rows = await db
				.select()
				.from(hrTermination)
				.where(
					and(
						eq(hrTermination.organizationId, input.organizationId),
						eq(hrTermination.id, input.terminationId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapTermination(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load termination");
		}
	},

	async findTerminationByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrTermination)
				.where(
					and(
						eq(hrTermination.organizationId, input.organizationId),
						eq(hrTermination.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapTermination(row);
			if (!mapped.ok) return mapped;
			return ok({
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

	async finalizeTermination(record, _ports, meta) {
		const existing = await this.findTerminationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.terminationRequestFingerprint !==
				record.terminationRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(existing.data.termination);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) return employment;
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
		if (!effectiveCheck.ok) return effectiveCheck;

		const currentEmployment = employment.data;
		const id = randomUUID();
		const brandedId = parseHumanResourcesTerminationId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextEmploymentVersion = currentEmployment.version + 1;
		const expectedEmploymentVersion = currentEmployment.version;

		try {
			const [rows] = await runNeonHttpTransaction<[TerminationSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH employment AS (
							SELECT id, organization_id, employee_id, starts_on, version
							FROM hr_employment
							WHERE id = ${record.employmentId}
								AND organization_id = ${record.organizationId}
								AND version = ${expectedEmploymentVersion}
						),
						mutated AS (
							INSERT INTO hr_termination (
								id, organization_id, employment_id, employee_id, status,
								reason_code, reason_detail, effective_on, finalized_at,
								create_idempotency_key, create_request_fingerprint, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, employment.organization_id, employment.id,
								employment.employee_id, 'finalized', ${record.reasonCode},
								${record.reasonDetail}, ${record.effectiveOn}, now(),
								${record.idempotencyKey}, ${record.terminationRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							FROM employment
							WHERE ${record.effectiveOn}::date >= employment.starts_on
								AND NOT EXISTS (
									SELECT 1 FROM hr_termination finalized
									WHERE finalized.organization_id = employment.organization_id
										AND finalized.employment_id = employment.id
										AND finalized.status = 'finalized'
								)
							RETURNING *
						),
						employment_updated AS (
							UPDATE hr_employment e
							SET status = 'terminated',
								ends_on = ${record.effectiveOn},
								version = ${nextEmploymentVersion},
								updated_by = ${record.createdBy},
								updated_at = now()
							FROM mutated
							WHERE e.id = mutated.employment_id
								AND e.organization_id = mutated.organization_id
								AND e.version = ${expectedEmploymentVersion}
							RETURNING e.id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_termination', id, 'CREATE', '[]'::jsonb
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
								'human-resources', ${meta.correlationId}, ${record.createdBy},
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'hr_employee',
									'entityId', employee_id::text,
									'actorId', ${record.createdBy}::text,
									'correlationId', ${meta.correlationId}::text
								),
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, employment_updated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Unable to finalize termination");
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
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.terminationRequestFingerprint !==
						record.terminationRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return ok(replay.data.termination);
				}
				return conflict("Employment already has a finalized termination");
			}
			return mapPersistenceFailure(error, "Failed to finalize termination");
		}
	},

	async getOffboardingCase(input) {
		try {
			const rows = await db
				.select()
				.from(hrOffboardingCase)
				.where(
					and(
						eq(hrOffboardingCase.organizationId, input.organizationId),
						eq(hrOffboardingCase.id, input.offboardingCaseId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapOffboardingCase(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load offboarding case");
		}
	},

	async findOffboardingByStartIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrOffboardingCase)
				.where(
					and(
						eq(hrOffboardingCase.organizationId, input.organizationId),
						eq(hrOffboardingCase.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapOffboardingCase(row);
			if (!mapped.ok) return mapped;
			return ok({
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

	async startOffboarding(record, _ports, meta) {
		const existing = await this.findOffboardingByStartIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.startRequestFingerprint !== record.startRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(existing.data.offboardingCase);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) return employment;
		if (employment.data === null) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const finalized = await db
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
		if (!eligibility.ok) return eligibility;

		const caseId = randomUUID();
		const brandedCaseId = parseHumanResourcesOffboardingCaseId(caseId);
		if (!brandedCaseId.ok) return brandedCaseId;
		const clearanceId = randomUUID();
		const brandedClearanceId = parseHumanResourcesClearanceId(clearanceId);
		if (!brandedClearanceId.ok) return brandedClearanceId;
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
			const [rows] = await runNeonHttpTransaction<[OffboardingCaseSqlRow[]]>(
				(sqlTag) => [
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
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_offboarding_case', id, 'CREATE', '[]'::jsonb
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
						SELECT mutated.* FROM mutated, tasks, clearance, audited, outboxed
					`,
				],
			);
			const row = rows[0];
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
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.startRequestFingerprint !==
						record.startRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return ok(replay.data.offboardingCase);
				}
			}
			return mapPersistenceFailure(error, "Failed to start offboarding");
		}
	},

	async completeOffboardingTask(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ case_id: string }[]]>(
				(sqlTag) => [
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
									entity_id, action, changes
								)
								SELECT
									${auditId}, ${input.organizationId}, ${input.actorUserId},
									${meta.correlationId}, 'human-resources', 'hr_offboarding_task',
									${input.taskId}, 'UPDATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Offboarding task",
				});
			}
			const caseId = parseHumanResourcesOffboardingCaseId(row.case_id);
			if (!caseId.ok) return caseId;
			const loaded = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: caseId.data,
			});
			if (!loaded.ok) return loaded;
			if (loaded.data === null) {
				return notFound("Offboarding case not found");
			}
			return ok(loaded.data);
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
		if (!offboardingCase.ok) return offboardingCase;
		if (offboardingCase.data === null) {
			return notFound("Offboarding case not found");
		}
		const caseActive = assertOffboardingCaseInProgress(
			offboardingCase.data.status,
		);
		if (!caseActive.ok) return caseActive;

		const interviewId = randomUUID();
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ case_id: string }[]]>(
				(sqlTag) => [
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
									entity_id, action, changes
								)
								SELECT
									${auditId}, ${input.organizationId}, ${input.actorUserId},
									${meta.correlationId}, 'human-resources', 'hr_exit_interview',
									${interviewId}, 'CREATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Unable to record exit interview");
			}
			return ok(offboardingCase.data);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Exit interview already recorded for this case");
			}
			return mapPersistenceFailure(error, "Failed to record exit interview");
		}
	},

	async recordClearance(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<
				[{ offboarding_case_id: string }[]]
			>((sqlTag) => [
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
							RETURNING c.offboarding_case_id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, ${input.organizationId}, ${input.actorUserId},
								${meta.correlationId}, 'human-resources', 'hr_clearance',
								${input.clearanceId}, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: false,
					entityLabel: "Clearance",
				});
			}
			const caseId = parseHumanResourcesOffboardingCaseId(
				row.offboarding_case_id,
			);
			if (!caseId.ok) return caseId;
			const loaded = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: caseId.data,
			});
			if (!loaded.ok) return loaded;
			if (loaded.data === null) {
				return notFound("Offboarding case not found");
			}
			return ok(loaded.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to record clearance");
		}
	},

	async completeOffboarding(input, _ports, meta) {
		const nextVersion = input.expectedVersion + 1;
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
			const [rows] = await runNeonHttpTransaction<[OffboardingCaseSqlRow[]]>(
				(sqlTag) => [
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
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_offboarding_case', id, 'UPDATE', '[]'::jsonb
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
				],
			);
			const row = rows[0];
			if (!row) {
				const existing = await this.getOffboardingCase({
					organizationId: input.organizationId,
					offboardingCaseId: input.offboardingCaseId,
				});
				if (!existing.ok) return existing;
				if (existing.data === null) {
					return notFound("Offboarding case not found");
				}
				return invalidState(
					"Offboarding cannot be completed until mandatory tasks, exit interview, and clearance are done",
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
			if (!caseRow.ok) return caseRow;
			if (caseRow.data === null) {
				return notFound("Onboarding case not found");
			}
			const rows = await db
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
				if (!mapped.ok) return mapped;
				tasks.push(mapped.data);
			}
			return ok(tasks);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list onboarding tasks");
		}
	},

	async listOffboardingTasks(input) {
		try {
			const caseRow = await this.getOffboardingCase({
				organizationId: input.organizationId,
				offboardingCaseId: input.offboardingCaseId,
			});
			if (!caseRow.ok) return caseRow;
			if (caseRow.data === null) {
				return notFound("Offboarding case not found");
			}
			const rows = await db
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
				if (!mapped.ok) return mapped;
				tasks.push(mapped.data);
			}
			return ok(tasks);
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
			if (!caseRow.ok) return caseRow;
			if (caseRow.data === null) {
				return notFound("Offboarding case not found");
			}
			const rows = await db
				.select()
				.from(hrClearance)
				.where(
					and(
						eq(hrClearance.organizationId, input.organizationId),
						eq(hrClearance.offboardingCaseId, input.offboardingCaseId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapClearance(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to get clearance");
		}
	},
};

export function attachDrizzleLifecycle(target: LifecycleHost): void {
	Object.assign(target, drizzleLifecycleMethods);
}
