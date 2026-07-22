import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	desc,
	eq,
	hrEmployeeCase,
	hrEmployeeCaseAction,
	hrEmployeeCaseAppeal,
	hrEmployeeCaseEvent,
	runNeonHttpTransaction,
} from "@afenda/db";
import { ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_EMPLOYEE_CASE_ACTION_APPROVED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_APPEAL_RESOLVED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_CLOSED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_FINDING_RECORDED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_INTERIM_MEASURE_ISSUED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_OPENED_EVENT,
} from "@afenda/events/schemas";

import {
	type HumanResourcesEmployeeCaseActionId,
	type HumanResourcesEmployeeCaseAppealId,
	type HumanResourcesEmployeeCaseEventId,
	type HumanResourcesEmployeeCaseId,
	parseHumanResourcesEmployeeCaseActionId,
	parseHumanResourcesEmployeeCaseAppealId,
	parseHumanResourcesEmployeeCaseEventId,
	parseHumanResourcesEmployeeCaseId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
} from "../../brands";
import type {
	EmployeeCase,
	EmployeeCaseAction,
	EmployeeCaseAppeal,
	EmployeeCaseEvent,
	EmployeeCaseListPage,
	EmployeeCaseOutcome,
	EmployeeCaseParticipant,
	EmployeeCaseTimeline,
} from "../../employee-relations/types";
import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
} from "../../error-codes";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import {
	assertEmployeeCaseMutable,
	assertEmployeeCaseOwnerNotConflicted,
	assertEmployeeCaseStatusAllowsActionRecommend,
	assertEmployeeCaseStatusAllowsAppeal,
	assertEmployeeCaseStatusAllowsFinding,
	assertInterimMeasureDates,
	assertPolicyValidationForAction,
} from "../../shared/employee-relations-guards";
import {
	employeeCaseActionStatusSchema,
	employeeCaseActionTypeSchema,
	employeeCaseAppealStatusSchema,
	employeeCaseEventKindSchema,
	employeeCaseInterimStatusSchema,
	employeeCaseParticipantRoleSchema,
	employeeCaseSeveritySchema,
	employeeCaseStatusSchema,
	employeeCaseTypeSchema,
} from "../../shared/employee-relations-status";
import {
	isCreateIdempotencyUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { HumanResourcesStore } from "../../store";

export type DrizzleEmployeeRelationsMethods = Pick<
	HumanResourcesStore,
	| "openEmployeeCase"
	| "findEmployeeCaseByIdempotencyKey"
	| "getEmployeeCaseById"
	| "listEmployeeCases"
	| "listCasesAssignedToActor"
	| "listOpenEmployeeRelationsCases"
	| "getEmployeeRelationsHistoryByEmployee"
	| "updateEmployeeCaseClassification"
	| "assignEmployeeCaseOwner"
	| "addEmployeeCaseParticipant"
	| "recordEmployeeCaseEvent"
	| "addEmployeeCaseEvidenceReference"
	| "redactEmployeeCaseEvidenceReference"
	| "issueInterimEmployeeMeasure"
	| "recordEmployeeCaseFinding"
	| "recommendEmployeeCaseAction"
	| "findEmployeeCaseActionByIdempotencyKey"
	| "approveEmployeeCaseAction"
	| "recordEmployeeCaseAppeal"
	| "findEmployeeCaseAppealByIdempotencyKey"
	| "resolveEmployeeCaseAppeal"
	| "closeEmployeeCase"
	| "reopenEmployeeCase"
	| "getEmployeeCaseTimeline"
	| "getEmployeeCaseOutcome"
>;

type EmployeeRelationsHost = {
	getEmployeeById: HumanResourcesStore["getEmployeeById"];
	getEmploymentById: HumanResourcesStore["getEmploymentById"];
};

type CaseRow = typeof hrEmployeeCase.$inferSelect;
type EventRow = typeof hrEmployeeCaseEvent.$inferSelect;
type ActionRow = typeof hrEmployeeCaseAction.$inferSelect;
type AppealRow = typeof hrEmployeeCaseAppeal.$inferSelect;

type CaseSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	employment_id: string;
	case_type: string;
	status: string;
	severity: string;
	allegation_summary: string;
	classification_code: string;
	owner_actor_user_id: string;
	subject_actor_user_id: string | null;
	participants: unknown;
	conflicted_actor_user_ids: unknown;
	interim_authority: string | null;
	interim_reason: string | null;
	interim_starts_on: string | null;
	interim_review_on: string | null;
	interim_status: string | null;
	finding_code: string | null;
	finding_summary: string | null;
	finding_recorded_by: string | null;
	finding_recorded_at: Date | null;
	outcome_code: string | null;
	closed_at: Date | null;
	closed_by: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type EventSqlRow = {
	id: string;
	organization_id: string;
	case_id: string;
	event_kind: string;
	sequence_no: number;
	document_ref: string | null;
	payload_json: unknown;
	redacts_event_id: string | null;
	recorded_by: string;
	recorded_at: Date;
	created_at: Date;
};

type ActionSqlRow = {
	id: string;
	organization_id: string;
	case_id: string;
	action_type: string;
	status: string;
	recommended_by: string;
	approved_by: string | null;
	policy_validation_recorded: boolean;
	recommendation_note: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type AppealSqlRow = {
	id: string;
	organization_id: string;
	case_id: string;
	original_finding_code: string;
	original_finding_recorded_at: Date;
	appeal_grounds_summary: string;
	status: string;
	appeal_outcome_code: string | null;
	resolved_by: string | null;
	resolved_at: Date | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function entityPayloadJson(input: {
	organizationId: string;
	entityType: string;
	entityId: string;
	actorId: string;
	correlationId: string;
}): string {
	return JSON.stringify({
		organizationId: input.organizationId,
		entityType: input.entityType,
		entityId: input.entityId,
		actorId: input.actorId,
		correlationId: input.correlationId,
	});
}

function parseParticipants(raw: unknown): Result<EmployeeCaseParticipant[]> {
	if (!Array.isArray(raw)) return invalidState("Invalid case participants");
	const participants: EmployeeCaseParticipant[] = [];
	for (const item of raw) {
		if (typeof item !== "object" || item === null) {
			return invalidState("Invalid case participants");
		}
		const record = item as Record<string, unknown>;
		if (
			typeof record.actorUserId !== "string" ||
			typeof record.addedAt !== "string"
		) {
			return invalidState("Invalid case participants");
		}
		const role = employeeCaseParticipantRoleSchema.safeParse(record.role);
		if (!role.success) return invalidState("Invalid case participants");
		participants.push({
			actorUserId: record.actorUserId,
			role: role.data,
			addedAt: record.addedAt,
		});
	}
	return ok(participants);
}

function parseConflictedIds(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((value): value is string => typeof value === "string");
}

function mapCase(row: CaseRow): Result<EmployeeCase> {
	const id = parseHumanResourcesEmployeeCaseId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const caseType = employeeCaseTypeSchema.safeParse(row.caseType);
	if (!caseType.success) return invalidState("Invalid case type");
	const status = employeeCaseStatusSchema.safeParse(row.status);
	if (!status.success) return invalidState("Invalid case status");
	const severity = employeeCaseSeveritySchema.safeParse(row.severity);
	if (!severity.success) return invalidState("Invalid case severity");
	const participants = parseParticipants(row.participants);
	if (!participants.ok) return participants;
	const interimParsed =
		row.interimStatus === null
			? null
			: employeeCaseInterimStatusSchema.safeParse(row.interimStatus);
	if (interimParsed !== null && !interimParsed.success) {
		return invalidState("Invalid interim status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		caseType: caseType.data,
		status: status.data,
		severity: severity.data,
		allegationSummary: row.allegationSummary,
		classificationCode: row.classificationCode,
		ownerActorUserId: row.ownerActorUserId,
		subjectActorUserId: row.subjectActorUserId,
		participants: participants.data,
		conflictedActorUserIds: parseConflictedIds(row.conflictedActorUserIds),
		interimAuthority: row.interimAuthority,
		interimReason: row.interimReason,
		interimStartsOn: row.interimStartsOn,
		interimReviewOn: row.interimReviewOn,
		interimStatus: interimParsed === null ? null : interimParsed.data,
		findingCode: row.findingCode,
		findingSummary: row.findingSummary,
		findingRecordedBy: row.findingRecordedBy,
		findingRecordedAt: row.findingRecordedAt,
		outcomeCode: row.outcomeCode,
		closedAt: row.closedAt,
		closedBy: row.closedBy,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCaseSql(row: CaseSqlRow): Result<EmployeeCase> {
	return mapCase({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		employmentId: row.employment_id,
		caseType: row.case_type,
		status: row.status,
		severity: row.severity,
		allegationSummary: row.allegation_summary,
		classificationCode: row.classification_code,
		ownerActorUserId: row.owner_actor_user_id,
		subjectActorUserId: row.subject_actor_user_id,
		participants: row.participants,
		conflictedActorUserIds: row.conflicted_actor_user_ids,
		interimAuthority: row.interim_authority,
		interimReason: row.interim_reason,
		interimStartsOn: row.interim_starts_on,
		interimReviewOn: row.interim_review_on,
		interimStatus: row.interim_status,
		findingCode: row.finding_code,
		findingSummary: row.finding_summary,
		findingRecordedBy: row.finding_recorded_by,
		findingRecordedAt: row.finding_recorded_at,
		outcomeCode: row.outcome_code,
		closedAt: row.closed_at,
		closedBy: row.closed_by,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapEvent(row: EventRow): Result<EmployeeCaseEvent> {
	const id = parseHumanResourcesEmployeeCaseEventId(row.id);
	if (!id.ok) return id;
	const caseId = parseHumanResourcesEmployeeCaseId(row.caseId);
	if (!caseId.ok) return caseId;
	const eventKind = employeeCaseEventKindSchema.safeParse(row.eventKind);
	if (!eventKind.success) return invalidState("Invalid case event kind");
	let redactsEventId: EmployeeCaseEvent["redactsEventId"] = null;
	if (row.redactsEventId !== null) {
		const parsed = parseHumanResourcesEmployeeCaseEventId(row.redactsEventId);
		if (!parsed.ok) return parsed;
		redactsEventId = parsed.data;
	}
	const payloadJson =
		row.payloadJson === null || typeof row.payloadJson !== "object"
			? null
			: { ...(row.payloadJson as Record<string, unknown>) };
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		caseId: caseId.data,
		eventKind: eventKind.data,
		sequenceNo: row.sequenceNo,
		documentRef: row.documentRef,
		payloadJson,
		redactsEventId,
		recordedBy: row.recordedBy,
		recordedAt: row.recordedAt,
		createdAt: row.createdAt,
	});
}

function mapEventSql(row: EventSqlRow): Result<EmployeeCaseEvent> {
	return mapEvent({
		id: row.id,
		organizationId: row.organization_id,
		caseId: row.case_id,
		eventKind: row.event_kind,
		sequenceNo: row.sequence_no,
		documentRef: row.document_ref,
		payloadJson: row.payload_json,
		redactsEventId: row.redacts_event_id,
		recordedBy: row.recorded_by,
		recordedAt: row.recorded_at,
		createdAt: row.created_at,
	});
}

function mapAction(row: ActionRow): Result<EmployeeCaseAction> {
	const id = parseHumanResourcesEmployeeCaseActionId(row.id);
	if (!id.ok) return id;
	const caseId = parseHumanResourcesEmployeeCaseId(row.caseId);
	if (!caseId.ok) return caseId;
	const actionType = employeeCaseActionTypeSchema.safeParse(row.actionType);
	if (!actionType.success) return invalidState("Invalid case action type");
	const status = employeeCaseActionStatusSchema.safeParse(row.status);
	if (!status.success) return invalidState("Invalid case action status");
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		caseId: caseId.data,
		actionType: actionType.data,
		status: status.data,
		recommendedBy: row.recommendedBy,
		approvedBy: row.approvedBy,
		policyValidationRecorded: row.policyValidationRecorded,
		recommendationNote: row.recommendationNote,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapActionSql(row: ActionSqlRow): Result<EmployeeCaseAction> {
	return mapAction({
		id: row.id,
		organizationId: row.organization_id,
		caseId: row.case_id,
		actionType: row.action_type,
		status: row.status,
		recommendedBy: row.recommended_by,
		approvedBy: row.approved_by,
		policyValidationRecorded: row.policy_validation_recorded,
		recommendationNote: row.recommendation_note,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapAppeal(row: AppealRow): Result<EmployeeCaseAppeal> {
	const id = parseHumanResourcesEmployeeCaseAppealId(row.id);
	if (!id.ok) return id;
	const caseId = parseHumanResourcesEmployeeCaseId(row.caseId);
	if (!caseId.ok) return caseId;
	const status = employeeCaseAppealStatusSchema.safeParse(row.status);
	if (!status.success) return invalidState("Invalid case appeal status");
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		caseId: caseId.data,
		originalFindingCode: row.originalFindingCode,
		originalFindingRecordedAt: row.originalFindingRecordedAt,
		appealGroundsSummary: row.appealGroundsSummary,
		status: status.data,
		appealOutcomeCode: row.appealOutcomeCode,
		resolvedBy: row.resolvedBy,
		resolvedAt: row.resolvedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapAppealSql(row: AppealSqlRow): Result<EmployeeCaseAppeal> {
	return mapAppeal({
		id: row.id,
		organizationId: row.organization_id,
		caseId: row.case_id,
		originalFindingCode: row.original_finding_code,
		originalFindingRecordedAt: row.original_finding_recorded_at,
		appealGroundsSummary: row.appeal_grounds_summary,
		status: row.status,
		appealOutcomeCode: row.appeal_outcome_code,
		resolvedBy: row.resolved_by,
		resolvedAt: row.resolved_at,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function hasCaseAccess(caseRecord: EmployeeCase, actorUserId: string): boolean {
	if (caseRecord.ownerActorUserId === actorUserId) return true;
	return caseRecord.participants.some((p) => p.actorUserId === actorUserId);
}

function paginateCases(
	cases: EmployeeCase[],
	page: number,
	pageSize: number,
): EmployeeCaseListPage {
	const sorted = [...cases].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
	);
	const offset = (page - 1) * pageSize;
	return {
		cases: sorted.slice(offset, offset + pageSize),
		totalCount: sorted.length,
		page,
		pageSize,
	};
}

function idempotencyConflict(): Result<never> {
	return conflict("Idempotency key reused with different payload");
}

async function fetchCaseById(input: {
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
}): Promise<Result<EmployeeCase | null>> {
	try {
		const rows = await db
			.select()
			.from(hrEmployeeCase)
			.where(
				and(
					eq(hrEmployeeCase.organizationId, input.organizationId),
					eq(hrEmployeeCase.id, input.caseId),
				),
			)
			.limit(1);
		const row = rows[0];
		if (!row) return ok(null);
		return mapCase(row);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to load employee case");
	}
}

async function fetchCaseInOrg(input: {
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
}): Promise<Result<EmployeeCase>> {
	const loaded = await fetchCaseById(input);
	if (!loaded.ok) return loaded;
	if (loaded.data === null) {
		return notFound("Case not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
	}
	return ok(loaded.data);
}

async function fetchCaseWithAccess(input: {
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	actorUserId: string;
}): Promise<Result<EmployeeCase>> {
	const loaded = await fetchCaseInOrg({
		organizationId: input.organizationId,
		caseId: input.caseId,
	});
	if (!loaded.ok) return loaded;
	if (!hasCaseAccess(loaded.data, input.actorUserId)) {
		return notFound("Case not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
	}
	return loaded;
}

async function fetchEventInOrg(input: {
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	eventId: HumanResourcesEmployeeCaseEventId;
}): Promise<Result<EmployeeCaseEvent>> {
	try {
		const rows = await db
			.select()
			.from(hrEmployeeCaseEvent)
			.where(
				and(
					eq(hrEmployeeCaseEvent.organizationId, input.organizationId),
					eq(hrEmployeeCaseEvent.caseId, input.caseId),
					eq(hrEmployeeCaseEvent.id, input.eventId),
				),
			)
			.limit(1);
		const row = rows[0];
		if (!row) {
			return notFound("Case event not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
		}
		return mapEvent(row);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to load case event");
	}
}

async function fetchActionInOrg(input: {
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	actionId: HumanResourcesEmployeeCaseActionId;
}): Promise<Result<EmployeeCaseAction>> {
	try {
		const rows = await db
			.select()
			.from(hrEmployeeCaseAction)
			.where(
				and(
					eq(hrEmployeeCaseAction.organizationId, input.organizationId),
					eq(hrEmployeeCaseAction.caseId, input.caseId),
					eq(hrEmployeeCaseAction.id, input.actionId),
				),
			)
			.limit(1);
		const row = rows[0];
		if (!row) {
			return notFound("Case action not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
		}
		return mapAction(row);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to load case action");
	}
}

async function fetchAppealInOrg(input: {
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	appealId: HumanResourcesEmployeeCaseAppealId;
}): Promise<Result<EmployeeCaseAppeal>> {
	try {
		const rows = await db
			.select()
			.from(hrEmployeeCaseAppeal)
			.where(
				and(
					eq(hrEmployeeCaseAppeal.organizationId, input.organizationId),
					eq(hrEmployeeCaseAppeal.caseId, input.caseId),
					eq(hrEmployeeCaseAppeal.id, input.appealId),
				),
			)
			.limit(1);
		const row = rows[0];
		if (!row) {
			return notFound("Case appeal not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
		}
		return mapAppeal(row);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to load case appeal");
	}
}

async function listCasesForOrg(
	organizationId: string,
): Promise<Result<EmployeeCase[]>> {
	try {
		const rows = await db
			.select()
			.from(hrEmployeeCase)
			.where(eq(hrEmployeeCase.organizationId, organizationId))
			.orderBy(desc(hrEmployeeCase.createdAt));
		const cases: EmployeeCase[] = [];
		for (const row of rows) {
			const mapped = mapCase(row);
			if (!mapped.ok) return mapped;
			cases.push(mapped.data);
		}
		return ok(cases);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to list employee cases");
	}
}

export const drizzleEmployeeRelationsMethods: DrizzleEmployeeRelationsMethods &
	ThisType<EmployeeRelationsHost & DrizzleEmployeeRelationsMethods> = {
	async findEmployeeCaseByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmployeeCase)
				.where(
					and(
						eq(hrEmployeeCase.organizationId, input.organizationId),
						eq(hrEmployeeCase.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapCase(row);
			if (!mapped.ok) return mapped;
			return ok({
				caseId: mapped.data.id,
				createRequestFingerprint: row.createRequestFingerprint,
				case: mapped.data,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find employee case by idempotency key",
			);
		}
	},

	async openEmployeeCase(record, _ports, meta) {
		const existing = await this.findEmployeeCaseByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint !==
				record.createRequestFingerprint
			) {
				return idempotencyConflict();
			}
			return ok(existing.data.case);
		}
		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) return notFound("Employee not found");
		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) return employment;
		if (employment.data === null) return notFound("Employment not found");
		if (employment.data.employeeId !== record.employeeId) {
			return notFound(
				"Employment not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const coi = assertEmployeeCaseOwnerNotConflicted({
			ownerActorUserId: record.ownerActorUserId,
			conflictedActorUserIds: record.conflictedActorUserIds,
			subjectActorUserId: record.subjectActorUserId,
		});
		if (!coi.ok) return coi;
		const caseId = parseHumanResourcesEmployeeCaseId(randomUUID());
		if (!caseId.ok) return caseId;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const outboxId = randomUUID();
		const conflictedJson = JSON.stringify(record.conflictedActorUserIds);
		const outboxPayload = entityPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_employee_case",
			entityId: caseId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[CaseSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH employee AS (
						SELECT id FROM hr_employee
						WHERE id = ${record.employeeId} AND organization_id = ${record.organizationId}
					),
					employment AS (
						SELECT id FROM hr_employment
						WHERE id = ${record.employmentId}
							AND organization_id = ${record.organizationId}
							AND employee_id = ${record.employeeId}
					),
					mutated AS (
						INSERT INTO hr_employee_case (
							id, organization_id, employee_id, employment_id, case_type, status,
							severity, allegation_summary, classification_code, owner_actor_user_id,
							subject_actor_user_id, participants, conflicted_actor_user_ids,
							create_idempotency_key, create_request_fingerprint, version,
							created_by, updated_by
						)
						SELECT
							${caseId.data}, ${record.organizationId}, employee.id, employment.id,
							${record.caseType}, 'open', ${record.severity}, ${record.allegationSummary},
							${record.classificationCode}, ${record.ownerActorUserId},
							${record.subjectActorUserId}, '[]'::jsonb, ${conflictedJson}::jsonb,
							${record.createIdempotencyKey}, ${record.createRequestFingerprint},
							1, ${record.createdBy}, ${record.createdBy}
						FROM employee, employment
						WHERE EXISTS (SELECT 1 FROM employee) AND EXISTS (SELECT 1 FROM employment)
						RETURNING *
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, organization_id, id, 'case_opened', 1, created_by, created_at
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
							'human-resources', 'hr_employee_case', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${outboxId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_CASE_OPENED_EVENT},
							'human-resources', ${meta.correlationId}, created_by,
							${outboxPayload}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed, inserted_event
				`,
			]);
			const row = rows[0];
			if (!row) return notFound("Employee or employment not found");
			return mapCaseSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findEmployeeCaseByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.case);
					}
					return idempotencyConflict();
				}
			}
			return mapPersistenceFailure(error, "Failed to open employee case");
		}
	},

	async getEmployeeCaseById(input) {
		return fetchCaseWithAccess(input);
	},

	async listEmployeeCases(input) {
		const page = input.page ?? 1;
		const pageSize = input.pageSize ?? 20;
		const loaded = await listCasesForOrg(input.organizationId);
		if (!loaded.ok) return loaded;
		const filtered = loaded.data.filter((caseRecord) => {
			if (!hasCaseAccess(caseRecord, input.actorUserId)) return false;
			if (input.status !== undefined && caseRecord.status !== input.status) {
				return false;
			}
			return true;
		});
		return ok(paginateCases(filtered, page, pageSize));
	},

	async listCasesAssignedToActor(input) {
		const page = input.page ?? 1;
		const pageSize = input.pageSize ?? 20;
		const loaded = await listCasesForOrg(input.organizationId);
		if (!loaded.ok) return loaded;
		const filtered = loaded.data.filter((caseRecord) =>
			hasCaseAccess(caseRecord, input.actorUserId),
		);
		return ok(paginateCases(filtered, page, pageSize));
	},

	async listOpenEmployeeRelationsCases(input) {
		const page = input.page ?? 1;
		const pageSize = input.pageSize ?? 20;
		const loaded = await listCasesForOrg(input.organizationId);
		if (!loaded.ok) return loaded;
		const filtered = loaded.data.filter(
			(caseRecord) =>
				caseRecord.status !== "closed" &&
				hasCaseAccess(caseRecord, input.actorUserId),
		);
		return ok(paginateCases(filtered, page, pageSize));
	},

	async getEmployeeRelationsHistoryByEmployee(input) {
		const page = input.page ?? 1;
		const pageSize = input.pageSize ?? 20;
		const loaded = await listCasesForOrg(input.organizationId);
		if (!loaded.ok) return loaded;
		const filtered = loaded.data.filter(
			(caseRecord) => caseRecord.employeeId === input.employeeId,
		);
		return ok(paginateCases(filtered, page, pageSize));
	},

	async updateEmployeeCaseClassification(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const nextVersion = input.expectedVersion + 1;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[CaseSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					mutated AS (
						UPDATE hr_employee_case
						SET classification_code = ${input.classificationCode},
							status = CASE WHEN status = 'open' THEN 'investigating' ELSE status END,
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status <> 'closed'
						RETURNING *
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, mutated.organization_id, mutated.id,
							'classification_updated', next_seq.seq, ${input.actorUserId}, now()
						FROM mutated, next_seq
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, inserted_event
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapCaseSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to update employee case classification",
			);
		}
	},

	async assignEmployeeCaseOwner(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const coi = assertEmployeeCaseOwnerNotConflicted({
			ownerActorUserId: input.ownerActorUserId,
			conflictedActorUserIds: loaded.data.conflictedActorUserIds,
			subjectActorUserId: loaded.data.subjectActorUserId,
		});
		if (!coi.ok) return coi;
		const nextVersion = input.expectedVersion + 1;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[CaseSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					mutated AS (
						UPDATE hr_employee_case
						SET owner_actor_user_id = ${input.ownerActorUserId},
							status = CASE WHEN status = 'open' THEN 'investigating' ELSE status END,
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status <> 'closed'
						RETURNING *
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, mutated.organization_id, mutated.id,
							'owner_assigned', next_seq.seq, ${input.actorUserId}, now()
						FROM mutated, next_seq
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, inserted_event
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapCaseSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to assign employee case owner",
			);
		}
	},

	async addEmployeeCaseParticipant(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		if (
			loaded.data.participants.some(
				(participant) =>
					participant.actorUserId === input.participantActorUserId,
			)
		) {
			return conflict("Participant is already on the case");
		}
		const addedAt = new Date().toISOString();
		const participantJson = JSON.stringify([
			{
				actorUserId: input.participantActorUserId,
				role: input.role,
				addedAt,
			},
		]);
		const nextVersion = input.expectedVersion + 1;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[CaseSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					mutated AS (
						UPDATE hr_employee_case
						SET participants = participants || ${participantJson}::jsonb,
							status = CASE WHEN status = 'open' THEN 'investigating' ELSE status END,
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status <> 'closed'
						RETURNING *
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, mutated.organization_id, mutated.id,
							'participant_added', next_seq.seq, ${input.actorUserId}, now()
						FROM mutated, next_seq
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, inserted_event
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapCaseSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to add employee case participant",
			);
		}
	},

	async recordEmployeeCaseEvent(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const payloadJson =
			input.payloadJson === undefined || input.payloadJson === null
				? null
				: JSON.stringify(input.payloadJson);
		const bumpCase = input.eventKind === "investigation_note";
		const nextVersion = bumpCase
			? loaded.data.version + 1
			: loaded.data.version;
		try {
			const [rows] = await runNeonHttpTransaction<[EventSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					case_row AS (
						SELECT id, organization_id
						FROM hr_employee_case
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND status <> 'closed'
					),
					case_update AS (
						UPDATE hr_employee_case
						SET status = CASE WHEN status = 'open' THEN 'investigating' ELSE status END,
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND status <> 'closed'
							AND ${bumpCase}
						RETURNING id
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no,
							payload_json, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, case_row.organization_id, case_row.id,
							${input.eventKind}, next_seq.seq,
							${payloadJson}::jsonb, ${input.actorUserId}, now()
						FROM case_row, next_seq
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case_event', id, 'CREATE', '[]'::jsonb
						FROM inserted_event
						RETURNING id
					)
					SELECT inserted_event.* FROM inserted_event, audited, case_row
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapEventSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record employee case event",
			);
		}
	},

	async addEmployeeCaseEvidenceReference(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const nextVersion = loaded.data.version + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[EventSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					case_update AS (
						UPDATE hr_employee_case
						SET status = CASE WHEN status = 'open' THEN 'investigating' ELSE status END,
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND status <> 'closed'
						RETURNING id, organization_id
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no,
							document_ref, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, case_update.organization_id, case_update.id,
							'evidence_reference_added', next_seq.seq,
							${input.documentRef}, ${input.actorUserId}, now()
						FROM case_update, next_seq
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case_event', id, 'CREATE', '[]'::jsonb
						FROM inserted_event
						RETURNING id
					)
					SELECT inserted_event.* FROM inserted_event, audited, case_update
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapEventSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to add employee case evidence reference",
			);
		}
	},

	async redactEmployeeCaseEvidenceReference(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		const targetEvent = await fetchEventInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
			eventId: input.eventId,
		});
		if (!targetEvent.ok) return targetEvent;
		if (targetEvent.data.eventKind !== "evidence_reference_added") {
			return invalidState("Only evidence references can be redacted");
		}
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const payloadJson = JSON.stringify({ reasonCode: input.reasonCode });
		try {
			const [rows] = await runNeonHttpTransaction<[EventSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					case_row AS (
						SELECT id, organization_id
						FROM hr_employee_case
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND status <> 'closed'
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no,
							payload_json, redacts_event_id, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, case_row.organization_id, case_row.id,
							'evidence_redacted', next_seq.seq,
							${payloadJson}::jsonb, ${input.eventId}, ${input.actorUserId}, now()
						FROM case_row, next_seq
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case_event', id, 'CREATE', '[]'::jsonb
						FROM inserted_event
						RETURNING id
					)
					SELECT inserted_event.* FROM inserted_event, audited, case_row
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapEventSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to redact employee case evidence reference",
			);
		}
	},

	async issueInterimEmployeeMeasure(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const dates = assertInterimMeasureDates({
			startsOn: input.interimStartsOn,
			reviewOn: input.interimReviewOn,
		});
		if (!dates.ok) return dates;
		const nextVersion = input.expectedVersion + 1;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const outboxId = randomUUID();
		const outboxPayload = entityPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employee_case",
			entityId: input.caseId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[CaseSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					mutated AS (
						UPDATE hr_employee_case
						SET interim_authority = ${input.interimAuthority},
							interim_reason = ${input.interimReason},
							interim_starts_on = ${input.interimStartsOn},
							interim_review_on = ${input.interimReviewOn},
							interim_status = 'active',
							status = CASE WHEN status = 'open' THEN 'investigating' ELSE status END,
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status <> 'closed'
						RETURNING *
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, mutated.organization_id, mutated.id,
							'interim_measure_issued', next_seq.seq, ${input.actorUserId}, now()
						FROM mutated, next_seq
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${outboxId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_CASE_INTERIM_MEASURE_ISSUED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${outboxPayload}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed, inserted_event
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapCaseSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to issue interim employee measure",
			);
		}
	},

	async recordEmployeeCaseFinding(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		const allowsFinding = assertEmployeeCaseStatusAllowsFinding(
			loaded.data.status,
		);
		if (!allowsFinding.ok) return allowsFinding;
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const nextVersion = input.expectedVersion + 1;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const outboxId = randomUUID();
		const outboxPayload = entityPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employee_case",
			entityId: input.caseId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[CaseSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					mutated AS (
						UPDATE hr_employee_case
						SET finding_code = ${input.findingCode},
							finding_summary = ${input.findingSummary},
							finding_recorded_by = ${input.actorUserId},
							finding_recorded_at = now(),
							status = 'finding_recorded',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status <> 'closed'
						RETURNING *
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, mutated.organization_id, mutated.id,
							'finding_recorded', next_seq.seq, ${input.actorUserId}, now()
						FROM mutated, next_seq
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${outboxId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_CASE_FINDING_RECORDED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${outboxPayload}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed, inserted_event
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapCaseSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record employee case finding",
			);
		}
	},

	async findEmployeeCaseActionByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmployeeCaseAction)
				.where(
					and(
						eq(hrEmployeeCaseAction.organizationId, input.organizationId),
						eq(hrEmployeeCaseAction.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapAction(row);
			if (!mapped.ok) return mapped;
			return ok({
				actionId: mapped.data.id,
				createRequestFingerprint: row.createRequestFingerprint,
				action: mapped.data,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find employee case action by idempotency key",
			);
		}
	},

	async recommendEmployeeCaseAction(record, _ports, meta) {
		const existing = await this.findEmployeeCaseActionByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint !==
				record.createRequestFingerprint
			) {
				return idempotencyConflict();
			}
			return ok(existing.data.action);
		}
		const loaded = await fetchCaseInOrg({
			organizationId: record.organizationId,
			caseId: record.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		const allowsRecommend = assertEmployeeCaseStatusAllowsActionRecommend(
			loaded.data.status,
		);
		if (!allowsRecommend.ok) return allowsRecommend;
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const actionId = parseHumanResourcesEmployeeCaseActionId(randomUUID());
		if (!actionId.ok) return actionId;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const nextCaseVersion = record.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[ActionSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${record.organizationId} AND case_id = ${record.caseId}
					),
					case_row AS (
						SELECT id, organization_id
						FROM hr_employee_case
						WHERE id = ${record.caseId}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND status <> 'closed'
					),
					inserted_action AS (
						INSERT INTO hr_employee_case_action (
							id, organization_id, case_id, action_type, status,
							recommended_by, policy_validation_recorded, recommendation_note,
							create_idempotency_key, create_request_fingerprint, version,
							created_by, updated_by
						)
						SELECT
							${actionId.data}, case_row.organization_id, case_row.id,
							${record.actionType}, 'recommended', ${record.recommendedBy},
							false, ${record.recommendationNote},
							${record.createIdempotencyKey}, ${record.createRequestFingerprint},
							1, ${record.recommendedBy}, ${record.recommendedBy}
						FROM case_row
						RETURNING *
					),
					case_update AS (
						UPDATE hr_employee_case
						SET status = 'action_pending',
							version = ${nextCaseVersion},
							updated_by = ${record.recommendedBy},
							updated_at = now()
						WHERE id = ${record.caseId}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND status <> 'closed'
						RETURNING id
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, case_row.organization_id, case_row.id,
							'action_recommended', next_seq.seq, ${record.recommendedBy}, now()
						FROM case_row, next_seq, case_update
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${record.recommendedBy}, ${meta.correlationId},
							'human-resources', 'hr_employee_case_action', id, 'CREATE', '[]'::jsonb
						FROM inserted_action
						RETURNING id
					)
					SELECT inserted_action.* FROM inserted_action, audited, case_update, inserted_event
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapActionSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findEmployeeCaseActionByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.action);
					}
					return idempotencyConflict();
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to recommend employee case action",
			);
		}
	},

	async approveEmployeeCaseAction(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		if (loaded.data.status !== "action_pending") {
			return invalidState(
				"Action cannot be approved in the current case status",
			);
		}
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const actionLoaded = await fetchActionInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
			actionId: input.actionId,
		});
		if (!actionLoaded.ok) return actionLoaded;
		if (actionLoaded.data.status !== "recommended") {
			return invalidState("Case action is not awaiting approval");
		}
		const policy = assertPolicyValidationForAction({
			actionType: actionLoaded.data.actionType,
			policyValidationRecorded: input.policyValidationRecorded,
		});
		if (!policy.ok) return policy;
		const nextCaseVersion = input.expectedVersion + 1;
		const nextActionVersion = actionLoaded.data.version + 1;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const outboxId = randomUUID();
		const outboxPayload = entityPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employee_case_action",
			entityId: input.actionId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[ActionSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					case_update AS (
						UPDATE hr_employee_case
						SET status = 'action_approved',
							version = ${nextCaseVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = 'action_pending'
						RETURNING id, organization_id
					),
					mutated_action AS (
						UPDATE hr_employee_case_action
						SET status = 'approved',
							approved_by = ${input.actorUserId},
							policy_validation_recorded = ${input.policyValidationRecorded},
							version = ${nextActionVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.actionId}
							AND organization_id = ${input.organizationId}
							AND case_id = ${input.caseId}
							AND status = 'recommended'
						RETURNING *
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, case_update.organization_id, case_update.id,
							'action_approved', next_seq.seq, ${input.actorUserId}, now()
						FROM case_update, next_seq, mutated_action
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case_action', id, 'UPDATE', '[]'::jsonb
						FROM mutated_action
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${outboxId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_CASE_ACTION_APPROVED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${outboxPayload}::jsonb, 'pending', 0
						FROM mutated_action
						RETURNING id
					)
					SELECT mutated_action.* FROM mutated_action, audited, case_update, outboxed, inserted_event
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case action",
				});
			}
			return mapActionSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to approve employee case action",
			);
		}
	},

	async findEmployeeCaseAppealByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmployeeCaseAppeal)
				.where(
					and(
						eq(hrEmployeeCaseAppeal.organizationId, input.organizationId),
						eq(hrEmployeeCaseAppeal.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapAppeal(row);
			if (!mapped.ok) return mapped;
			return ok({
				appealId: mapped.data.id,
				createRequestFingerprint: row.createRequestFingerprint,
				appeal: mapped.data,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find employee case appeal by idempotency key",
			);
		}
	},

	async recordEmployeeCaseAppeal(record, _ports, meta) {
		const existing = await this.findEmployeeCaseAppealByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint !==
				record.createRequestFingerprint
			) {
				return idempotencyConflict();
			}
			return ok(existing.data.appeal);
		}
		const loaded = await fetchCaseInOrg({
			organizationId: record.organizationId,
			caseId: record.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		const allowsAppeal = assertEmployeeCaseStatusAllowsAppeal(
			loaded.data.status,
		);
		if (!allowsAppeal.ok) return allowsAppeal;
		if (
			loaded.data.findingCode === null ||
			loaded.data.findingRecordedAt === null
		) {
			return invalidState("Finding must be recorded before an appeal");
		}
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const appealId = parseHumanResourcesEmployeeCaseAppealId(randomUUID());
		if (!appealId.ok) return appealId;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const nextCaseVersion = record.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[AppealSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${record.organizationId} AND case_id = ${record.caseId}
					),
					case_row AS (
						SELECT id, organization_id, finding_code, finding_recorded_at
						FROM hr_employee_case
						WHERE id = ${record.caseId}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND status <> 'closed'
							AND finding_code IS NOT NULL
							AND finding_recorded_at IS NOT NULL
					),
					inserted_appeal AS (
						INSERT INTO hr_employee_case_appeal (
							id, organization_id, case_id, original_finding_code,
							original_finding_recorded_at, appeal_grounds_summary, status,
							create_idempotency_key, create_request_fingerprint, version,
							created_by, updated_by
						)
						SELECT
							${appealId.data}, case_row.organization_id, case_row.id,
							case_row.finding_code, case_row.finding_recorded_at,
							${record.appealGroundsSummary}, 'open',
							${record.createIdempotencyKey}, ${record.createRequestFingerprint},
							1, ${record.createdBy}, ${record.createdBy}
						FROM case_row
						RETURNING *
					),
					case_update AS (
						UPDATE hr_employee_case
						SET status = 'under_appeal',
							version = ${nextCaseVersion},
							updated_by = ${record.createdBy},
							updated_at = now()
						WHERE id = ${record.caseId}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
						RETURNING id
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, case_row.organization_id, case_row.id,
							'appeal_recorded', next_seq.seq, ${record.createdBy}, now()
						FROM case_row, next_seq, case_update
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${record.createdBy}, ${meta.correlationId},
							'human-resources', 'hr_employee_case_appeal', id, 'CREATE', '[]'::jsonb
						FROM inserted_appeal
						RETURNING id
					)
					SELECT inserted_appeal.* FROM inserted_appeal, audited, case_update, inserted_event
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapAppealSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findEmployeeCaseAppealByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.appeal);
					}
					return idempotencyConflict();
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to record employee case appeal",
			);
		}
	},

	async resolveEmployeeCaseAppeal(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		if (loaded.data.status !== "under_appeal") {
			return invalidState("Case is not under appeal");
		}
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const appealLoaded = await fetchAppealInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
			appealId: input.appealId,
		});
		if (!appealLoaded.ok) return appealLoaded;
		if (appealLoaded.data.status !== "open") {
			return invalidState("Appeal is not open");
		}
		const nextCaseVersion = input.expectedVersion + 1;
		const nextAppealVersion = appealLoaded.data.version + 1;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const outboxId = randomUUID();
		const outboxPayload = entityPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employee_case_appeal",
			entityId: input.appealId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[AppealSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					case_update AS (
						UPDATE hr_employee_case
						SET status = 'action_approved',
							version = ${nextCaseVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = 'under_appeal'
						RETURNING id, organization_id
					),
					mutated_appeal AS (
						UPDATE hr_employee_case_appeal
						SET status = 'resolved',
							appeal_outcome_code = ${input.appealOutcomeCode},
							resolved_by = ${input.actorUserId},
							resolved_at = now(),
							version = ${nextAppealVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.appealId}
							AND organization_id = ${input.organizationId}
							AND case_id = ${input.caseId}
							AND status = 'open'
						RETURNING *
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, case_update.organization_id, case_update.id,
							'appeal_resolved', next_seq.seq, ${input.actorUserId}, now()
						FROM case_update, next_seq, mutated_appeal
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case_appeal', id, 'UPDATE', '[]'::jsonb
						FROM mutated_appeal
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${outboxId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_CASE_APPEAL_RESOLVED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${outboxPayload}::jsonb, 'pending', 0
						FROM mutated_appeal
						RETURNING id
					)
					SELECT mutated_appeal.* FROM mutated_appeal, audited, case_update, outboxed, inserted_event
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case appeal",
				});
			}
			return mapAppealSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve employee case appeal",
			);
		}
	},

	async closeEmployeeCase(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		const mutable = assertEmployeeCaseMutable(loaded.data.status);
		if (!mutable.ok) return mutable;
		if (
			loaded.data.status !== "finding_recorded" &&
			loaded.data.status !== "action_approved"
		) {
			return invalidState("Case cannot be closed in the current status");
		}
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const nextVersion = input.expectedVersion + 1;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const outboxId = randomUUID();
		const outboxPayload = entityPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employee_case",
			entityId: input.caseId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[CaseSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					mutated AS (
						UPDATE hr_employee_case
						SET status = 'closed',
							outcome_code = ${input.outcomeCode},
							closed_at = now(),
							closed_by = ${input.actorUserId},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status IN ('finding_recorded', 'action_approved')
						RETURNING *
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, mutated.organization_id, mutated.id,
							'case_closed', next_seq.seq, ${input.actorUserId}, now()
						FROM mutated, next_seq
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${outboxId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_CASE_CLOSED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${outboxPayload}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed, inserted_event
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapCaseSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to close employee case");
		}
	},

	async reopenEmployeeCase(input, _ports, meta) {
		const loaded = await fetchCaseInOrg({
			organizationId: input.organizationId,
			caseId: input.caseId,
		});
		if (!loaded.ok) return loaded;
		if (loaded.data.status !== "closed") {
			return invalidState("Only closed cases can be reopened");
		}
		const versionCheck = assertExpectedVersion(
			loaded.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const nextVersion = input.expectedVersion + 1;
		const eventId = parseHumanResourcesEmployeeCaseEventId(randomUUID());
		if (!eventId.ok) return eventId;
		const auditId = randomUUID();
		const payloadJson = JSON.stringify({ reasonCode: input.reasonCode });
		try {
			const [rows] = await runNeonHttpTransaction<[CaseSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH next_seq AS (
						SELECT COALESCE(MAX(sequence_no), 0) + 1 AS seq
						FROM hr_employee_case_event
						WHERE organization_id = ${input.organizationId} AND case_id = ${input.caseId}
					),
					mutated AS (
						UPDATE hr_employee_case
						SET status = 'open',
							outcome_code = NULL,
							closed_at = NULL,
							closed_by = NULL,
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.caseId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = 'closed'
						RETURNING *
					),
					inserted_event AS (
						INSERT INTO hr_employee_case_event (
							id, organization_id, case_id, event_kind, sequence_no,
							payload_json, recorded_by, recorded_at
						)
						SELECT
							${eventId.data}, mutated.organization_id, mutated.id,
							'case_reopened', next_seq.seq,
							${payloadJson}::jsonb, ${input.actorUserId}, now()
						FROM mutated, next_seq
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_case', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, inserted_event
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee case",
				});
			}
			return mapCaseSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to reopen employee case");
		}
	},

	async getEmployeeCaseTimeline(input) {
		const loaded = await fetchCaseWithAccess(input);
		if (!loaded.ok) return loaded;
		try {
			const rows = await db
				.select()
				.from(hrEmployeeCaseEvent)
				.where(
					and(
						eq(hrEmployeeCaseEvent.organizationId, input.organizationId),
						eq(hrEmployeeCaseEvent.caseId, input.caseId),
					),
				)
				.orderBy(asc(hrEmployeeCaseEvent.sequenceNo));
			const events: EmployeeCaseEvent[] = [];
			for (const row of rows) {
				const mapped = mapEvent(row);
				if (!mapped.ok) return mapped;
				events.push(mapped.data);
			}
			const timeline: EmployeeCaseTimeline = {
				caseId: input.caseId,
				events,
			};
			return ok(timeline);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load employee case timeline",
			);
		}
	},

	async getEmployeeCaseOutcome(input) {
		const loaded = await fetchCaseWithAccess(input);
		if (!loaded.ok) return loaded;
		try {
			const actionRows = await db
				.select()
				.from(hrEmployeeCaseAction)
				.where(
					and(
						eq(hrEmployeeCaseAction.organizationId, input.organizationId),
						eq(hrEmployeeCaseAction.caseId, input.caseId),
						eq(hrEmployeeCaseAction.status, "approved"),
					),
				);
			const approvedActions: EmployeeCaseAction[] = [];
			for (const row of actionRows) {
				const mapped = mapAction(row);
				if (!mapped.ok) return mapped;
				approvedActions.push(mapped.data);
			}
			const appealRows = await db
				.select()
				.from(hrEmployeeCaseAppeal)
				.where(
					and(
						eq(hrEmployeeCaseAppeal.organizationId, input.organizationId),
						eq(hrEmployeeCaseAppeal.caseId, input.caseId),
						eq(hrEmployeeCaseAppeal.status, "open"),
					),
				);
			const openAppeals: EmployeeCaseAppeal[] = [];
			for (const row of appealRows) {
				const mapped = mapAppeal(row);
				if (!mapped.ok) return mapped;
				openAppeals.push(mapped.data);
			}
			const terminationAction = approvedActions.find(
				(action) => action.actionType === "termination_recommendation",
			);
			const outcome: EmployeeCaseOutcome = {
				caseId: input.caseId,
				status: loaded.data.status,
				outcomeCode: loaded.data.outcomeCode,
				findingCode: loaded.data.findingCode,
				approvedActions,
				openAppeals,
				terminationHandoff:
					terminationAction === undefined
						? null
						: {
								caseId: loaded.data.id,
								actionId: terminationAction.id,
								organizationId: loaded.data.organizationId,
								employeeId: loaded.data.employeeId,
								employmentId: loaded.data.employmentId,
							},
			};
			return ok(outcome);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load employee case outcome",
			);
		}
	},
};

export function attachDrizzleEmployeeRelations(
	target: EmployeeRelationsHost,
): void {
	Object.assign(target, drizzleEmployeeRelationsMethods);
}
