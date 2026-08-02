/**
 * HR Time Neon HTTP transaction utilities (ARCH-025 · N12).
 *
 * Converts snake_case SQL rows from `runNeonHttpTransaction` into Drizzle
 * infer shapes consumed by the time adapter mappers.
 */

import { audit as afendaAudit } from "@afenda/audit";
import {
	database as afendaDatabase,
	type hrAttendanceAdjustment,
	type hrAttendanceBreakWaiverDecision,
	type hrAttendanceEvent,
	type hrAttendanceException,
	type hrAttendanceSession,
	type hrEmploymentCalendarAssignment,
	type hrShift,
	type hrShiftAssignment,
	type hrShiftBreak,
	type hrTimeApprovalAuthorityAssignment,
	type hrTimePolicy,
	type hrTimePolicyAssignment,
	type hrTimesheet,
	type hrTimesheetApprovalDecision,
	type hrWorkCalendar,
	type hrWorkCalendarHoliday,
	type hrWorkCalendarScopeAssignment,
	type NeonHttpSql,
	type NeonHttpTransactionQuery,
	type NeonHttpTransactionResults,
} from "@afenda/db";
import type { HumanResourcesEventType } from "@afenda/events";
import { HUMAN_RESOURCES_TIME_EXCEPTION_CREATED_EVENT } from "@afenda/events/schemas";

const TIME_AUDIT_SOURCE = "human-resources.time-drizzle";

export interface TimeAuditInput {
	action: "CREATE" | "UPDATE" | "DELETE";
	actorUserId: string;
	correlationId?: string | undefined;
	entity: string;
	entityId: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	reasonCode: string;
}

function timeAuditCommand(input: TimeAuditInput) {
	const correlationId =
		input.correlationId ?? `hr-time-${input.entity}-${input.entityId}`;
	return {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId,
		module: "human-resources",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		oldValue: input.oldValue ?? null,
		newValue: input.newValue ?? null,
		eventContext: {
			version: 1 as const,
			outcome: "SUCCEEDED" as const,
			source: TIME_AUDIT_SOURCE,
			causationId: correlationId,
			reasonCode: input.reasonCode,
		},
	};
}

export function prepareTimeAudit(
	input: TimeAuditInput,
): ReturnType<typeof afendaAudit.transaction.prepare> {
	return afendaAudit.transaction.prepare(timeAuditCommand(input));
}

export function buildTimeAuditInsert(
	sql: NeonHttpSql,
	input: TimeAuditInput,
): NeonHttpTransactionQuery {
	const built = afendaAudit.transaction.buildInsert({
		sql,
		input: timeAuditCommand(input),
	});
	if (!built.ok) {
		throw new TypeError("Invalid generated Time audit command");
	}
	return built.data;
}

export function buildTimeOutboxInsert(
	sql: NeonHttpSql,
	input: {
		actorUserId: string;
		correlationId: string;
		entityId: string;
		entityType: string;
		eventId: string;
		eventType: HumanResourcesEventType;
		organizationId: string;
	},
): NeonHttpTransactionQuery {
	const payload = JSON.stringify({
		organizationId: input.organizationId,
		entityType: input.entityType,
		entityId: input.entityId,
		actorId: input.actorUserId,
		correlationId: input.correlationId,
	});
	return sql`
		INSERT INTO platform_domain_event (
			id, organization_id, type, source_module, correlation_id, actor_user_id,
			payload, status, attempts
		) VALUES (
			${input.eventId}, ${input.organizationId}, ${input.eventType},
			'human-resources', ${input.correlationId}, ${input.actorUserId},
			${payload}::jsonb, 'pending', 0
		)
		RETURNING id
	`;
}

export function buildDetectedAttendanceExceptionInsert(
	sql: NeonHttpSql,
	input: {
		actorUserId: string;
		auditId: string;
		correlationId: string;
		employeeId: string;
		eventType: string;
		exceptionId: string;
		organizationId: string;
		remarks: string | null;
		sessionId: string;
		severity: string;
		shiftAssignmentId: string | null;
	},
): NeonHttpTransactionQuery {
	const preparedAudit = prepareTimeAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: "hr_attendance_exception",
		entityId: input.exceptionId,
		action: "CREATE",
		reasonCode: "ATTENDANCE_EXCEPTION_AUTO_DETECT",
	});
	if (!preparedAudit.ok) {
		throw new TypeError("Invalid generated detected-exception audit command");
	}
	const auditEntry = preparedAudit.data;
	const payload = JSON.stringify({
		organizationId: input.organizationId,
		entityType: "hr_attendance_exception",
		entityId: input.exceptionId,
		actorId: input.actorUserId,
		correlationId: input.correlationId,
	});
	return sql`
		WITH inserted AS (
			INSERT INTO hr_attendance_exception (
				id, organization_id, employee_id, session_id, event_id,
				shift_assignment_id, exception_type, severity, detected_facts,
				review_status, resolution, reviewer_user_id, evidence_reference,
				remarks, version, created_by, updated_by
			)
			SELECT ${input.exceptionId}, ${input.organizationId}, ${input.employeeId},
				${input.sessionId}, NULL, ${input.shiftAssignmentId}, ${input.eventType},
				${input.severity}, NULL, 'open', NULL, NULL, NULL, ${input.remarks}, 1,
				${input.actorUserId}, ${input.actorUserId}
			WHERE NOT EXISTS (
				SELECT 1 FROM hr_attendance_exception
				WHERE organization_id = ${input.organizationId}
					AND employee_id = ${input.employeeId} AND session_id = ${input.sessionId}
					AND exception_type = ${input.eventType}
					AND review_status IN ('open', 'in_review')
					AND remarks IS NOT DISTINCT FROM ${input.remarks}
			)
			RETURNING id
		),
		audited AS (
			INSERT INTO platform_audit_log (
				id, organization_id, actor_user_id, correlation_id, module, entity,
				entity_id, action, changes, old_value, new_value, metadata,
				ip_address, user_agent
			)
			SELECT ${input.auditId}, ${auditEntry.organizationId}, ${auditEntry.actorUserId},
				${auditEntry.correlationId}, ${auditEntry.module}, ${auditEntry.entity},
				inserted.id, ${auditEntry.action}, ${auditEntry.changesJson}::jsonb,
				${auditEntry.oldValueJson}::jsonb, ${auditEntry.newValueJson}::jsonb,
				${auditEntry.metadataJson}::jsonb, ${auditEntry.ipAddress},
				${auditEntry.userAgent}
			FROM inserted RETURNING id
		),
		outboxed AS (
			INSERT INTO platform_domain_event (
				id, organization_id, type, source_module, correlation_id, actor_user_id,
				payload, status, attempts
			)
			SELECT gen_random_uuid(), ${input.organizationId},
				${HUMAN_RESOURCES_TIME_EXCEPTION_CREATED_EVENT}, 'human-resources',
				${input.correlationId}, ${input.actorUserId}, ${payload}::jsonb, 'pending', 0
			FROM inserted RETURNING id
		)
		SELECT id FROM inserted
	`;
}

function parseDate(value: Date | string): Date {
	return value instanceof Date ? value : new Date(value);
}

function parseNullableDate(value: Date | string | null): Date | null {
	if (value === null) {
		return null;
	}
	return parseDate(value);
}

export interface WorkCalendarSqlRow {
	calendar_version: string;
	code: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	id: string;
	name: string;
	organization_id: string;
	standard_hours_per_day: string;
	status: string;
	supersedes_calendar_id: string | null;
	timezone: string;
	updated_at: Date;
	updated_by: string;
	version: number;
	work_week_json: unknown;
}

export interface WorkCalendarHolidaySqlRow {
	calendar_id: string;
	created_at: Date;
	created_by: string;
	expected_minutes: number | null;
	holiday_date: string;
	id: string;
	is_working_day: boolean;
	jurisdiction: string | null;
	label: string | null;
	location_code: string | null;
	organization_id: string;
	override_kind: string;
	updated_at: Date;
	updated_by: string;
}

export interface EmploymentCalendarAssignmentSqlRow {
	calendar_id: string;
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	employee_id: string;
	employment_id: string;
	id: string;
	jurisdiction: string | null;
	location_code: string | null;
	organization_id: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface WorkCalendarScopeAssignmentSqlRow {
	calendar_id: string;
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	id: string;
	organization_id: string;
	scope_key: string;
	scope_type: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface TimePolicySqlRow {
	approval_steps: unknown;
	automatic_break_after_minutes: number | null;
	automatic_break_minutes: number;
	code: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	id: string;
	minimum_rest_minutes: number;
	name: string;
	organization_id: string;
	status: string;
	supersedes_policy_id: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface TimePolicyAssignmentSqlRow {
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	employment_id: string;
	id: string;
	organization_id: string;
	policy_id: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface TimeApprovalAuthorityAssignmentSqlRow {
	actor_user_id: string;
	authority: string;
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	id: string;
	organization_id: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface ShiftSqlRow {
	code: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	earliest_clock_in_local: string | null;
	effective_from: string;
	effective_to: string | null;
	end_local: string;
	expected_minutes: number;
	grace_early_minutes: number;
	grace_late_minutes: number;
	id: string;
	is_overnight: boolean;
	latest_clock_out_local: string | null;
	location_key: string | null;
	max_duration_minutes: number | null;
	min_duration_minutes: number | null;
	name: string;
	organization_id: string;
	overtime_eligible: boolean;
	shift_kind: string;
	start_local: string;
	status: string;
	supersedes_shift_id: string | null;
	timezone: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface ShiftAssignmentSqlRow {
	assignment_source: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string | null;
	ends_at: Date;
	id: string;
	location_key: string | null;
	organization_id: string;
	publication_status: string;
	scheduled_date: string;
	shift_id: string;
	starts_at: Date;
	timezone: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface ShiftBreakSqlRow {
	break_order: number;
	created_at: Date;
	duration_minutes: number;
	id: string;
	is_paid: boolean;
	label: string | null;
	organization_id: string;
	shift_id: string;
	start_offset_minutes: number;
	updated_at: Date;
}

export interface AttendanceEventSqlRow {
	captured_notes: string | null;
	captured_occurred_at: Date | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	device_metadata: unknown;
	employee_id: string;
	employment_id: string | null;
	event_type: string;
	id: string;
	local_work_date: string;
	location_key: string | null;
	notes: string | null;
	occurred_at: Date;
	organization_id: string;
	payload_checksum: string | null;
	shift_assignment_id: string | null;
	source: string;
	source_reference: string | null;
	source_sequence: number;
	source_timezone: string;
	updated_at: Date;
	updated_by: string;
	version: number;
	void_reason: string | null;
	voided_at: Date | null;
}

export interface AttendanceAdjustmentSqlRow {
	actor_user_id: string;
	adjustment_reason: string;
	correlation_id: string | null;
	created_at: Date;
	event_id: string;
	event_version_after: number | null;
	event_version_before: number | null;
	evidence_reference: string | null;
	id: string;
	new_notes: string | null;
	new_occurred_at: Date;
	organization_id: string;
	previous_notes: string | null;
	previous_occurred_at: Date;
	sequence: number | null;
}

export interface AttendanceExceptionSqlRow {
	created_at: Date;
	created_by: string;
	detected_facts: unknown;
	employee_id: string;
	event_id: string | null;
	evidence_reference: string | null;
	exception_type: string;
	id: string;
	organization_id: string;
	remarks: string | null;
	resolution: string | null;
	review_status: string;
	reviewer_user_id: string | null;
	session_id: string | null;
	severity: string;
	shift_assignment_id: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface AttendanceSessionSqlRow {
	break_minutes: number;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string | null;
	final_clock_out_at: Date | null;
	first_clock_in_at: Date | null;
	gross_minutes: number;
	id: string;
	local_work_date: string;
	organization_id: string;
	provenance: unknown;
	requires_review: boolean;
	resolution_status: string;
	shift_assignment_id: string | null;
	timezone: string;
	updated_at: Date;
	updated_by: string;
	version: number;
	worked_minutes: number;
}

export interface AttendanceBreakWaiverDecisionSqlRow {
	actor_user_id: string;
	authority: string;
	authority_assignment_id: string;
	automatic_break_minutes: number;
	correlation_id: string;
	created_at: Date;
	decided_at: Date;
	evidence_reference: string;
	id: string;
	organization_id: string;
	policy_id: string;
	reason: string;
	recorded_break_minutes: number;
	session_id: string;
	session_version: number;
}

export interface TimesheetSqlRow {
	approval_policy_id: string | null;
	approved_at: Date | null;
	approved_by: string | null;
	approver_notes: string | null;
	completed_approval_steps: number;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string | null;
	id: string;
	locked_at: Date | null;
	organization_id: string;
	period_end: string;
	period_start: string;
	rejected_at: Date | null;
	rejection_reason: string | null;
	required_approval_steps: unknown;
	returned_at: Date | null;
	status: string;
	submission_reference: string | null;
	submitted_at: Date | null;
	supersedes_timesheet_id: string | null;
	total_approved_minutes: number;
	total_recorded_minutes: number;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface TimesheetApprovalDecisionSqlRow {
	actor_user_id: string;
	authority: string;
	authority_assignment_id: string;
	comment: string | null;
	correlation_id: string;
	created_at: Date;
	decided_at: Date;
	id: string;
	organization_id: string;
	policy_id: string | null;
	step_index: number;
	submission_reference: string;
	timesheet_id: string;
	version_approved: number;
}

export async function runTimeTransaction(
	queriesOrFn: Parameters<typeof afendaDatabase.transaction>[0],
	options?: Parameters<typeof afendaDatabase.transaction>[1],
): Promise<NeonHttpTransactionResults> {
	return await afendaDatabase.transaction(queriesOrFn, {
		isolationLevel: "ReadCommitted",
		...options,
	});
}

export function workCalendarFromSql(
	row: WorkCalendarSqlRow,
): typeof hrWorkCalendar.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		timezone: row.timezone,
		calendarVersion: row.calendar_version,
		workWeekJson: row.work_week_json,
		standardHoursPerDay: row.standard_hours_per_day,
		status: row.status,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		supersedesCalendarId: row.supersedes_calendar_id,
		version: row.version,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function workCalendarHolidayFromSql(
	row: WorkCalendarHolidaySqlRow,
): typeof hrWorkCalendarHoliday.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		calendarId: row.calendar_id,
		holidayDate: row.holiday_date,
		label: row.label,
		locationCode: row.location_code,
		jurisdiction: row.jurisdiction,
		overrideKind: row.override_kind,
		isWorkingDay: row.is_working_day,
		expectedMinutes: row.expected_minutes,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function employmentCalendarAssignmentFromSql(
	row: EmploymentCalendarAssignmentSqlRow,
): typeof hrEmploymentCalendarAssignment.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		employmentId: row.employment_id,
		calendarId: row.calendar_id,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		locationCode: row.location_code,
		jurisdiction: row.jurisdiction,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function workCalendarScopeAssignmentFromSql(
	row: WorkCalendarScopeAssignmentSqlRow,
): typeof hrWorkCalendarScopeAssignment.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		scopeType: row.scope_type,
		scopeKey: row.scope_key,
		calendarId: row.calendar_id,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function timePolicyFromSql(
	row: TimePolicySqlRow,
): typeof hrTimePolicy.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		status: row.status,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		minimumRestMinutes: row.minimum_rest_minutes,
		automaticBreakAfterMinutes: row.automatic_break_after_minutes,
		automaticBreakMinutes: row.automatic_break_minutes,
		approvalSteps: row.approval_steps,
		supersedesPolicyId: row.supersedes_policy_id,
		version: row.version,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function timePolicyAssignmentFromSql(
	row: TimePolicyAssignmentSqlRow,
): typeof hrTimePolicyAssignment.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		policyId: row.policy_id,
		employmentId: row.employment_id,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function timeApprovalAuthorityAssignmentFromSql(
	row: TimeApprovalAuthorityAssignmentSqlRow,
): typeof hrTimeApprovalAuthorityAssignment.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		actorUserId: row.actor_user_id,
		authority: row.authority,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function shiftFromSql(row: ShiftSqlRow): typeof hrShift.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		shiftKind: row.shift_kind,
		startLocal: row.start_local,
		endLocal: row.end_local,
		isOvernight: row.is_overnight,
		expectedMinutes: row.expected_minutes,
		graceEarlyMinutes: row.grace_early_minutes,
		graceLateMinutes: row.grace_late_minutes,
		minDurationMinutes: row.min_duration_minutes,
		maxDurationMinutes: row.max_duration_minutes,
		earliestClockInLocal: row.earliest_clock_in_local,
		latestClockOutLocal: row.latest_clock_out_local,
		overtimeEligible: row.overtime_eligible,
		timezone: row.timezone,
		locationKey: row.location_key,
		status: row.status,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		supersedesShiftId: row.supersedes_shift_id,
		version: row.version,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function shiftAssignmentFromSql(
	row: ShiftAssignmentSqlRow,
): typeof hrShiftAssignment.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		employmentId: row.employment_id,
		shiftId: row.shift_id,
		scheduledDate: row.scheduled_date,
		startsAt: parseDate(row.starts_at),
		endsAt: parseDate(row.ends_at),
		locationKey: row.location_key,
		timezone: row.timezone,
		publicationStatus: row.publication_status,
		assignmentSource: row.assignment_source,
		version: row.version,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function shiftBreakFromSql(
	row: ShiftBreakSqlRow,
): typeof hrShiftBreak.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		shiftId: row.shift_id,
		breakOrder: row.break_order,
		startOffsetMinutes: row.start_offset_minutes,
		durationMinutes: row.duration_minutes,
		isPaid: row.is_paid,
		label: row.label,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function attendanceEventFromSql(
	row: AttendanceEventSqlRow,
): typeof hrAttendanceEvent.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		employmentId: row.employment_id,
		shiftAssignmentId: row.shift_assignment_id,
		eventType: row.event_type,
		capturedOccurredAt: parseNullableDate(row.captured_occurred_at),
		occurredAt: parseDate(row.occurred_at),
		sourceSequence: row.source_sequence,
		sourceTimezone: row.source_timezone,
		localWorkDate: row.local_work_date,
		source: row.source,
		sourceReference: row.source_reference,
		deviceMetadata: row.device_metadata,
		locationKey: row.location_key,
		capturedNotes: row.captured_notes,
		notes: row.notes,
		payloadChecksum: row.payload_checksum,
		voidedAt: parseNullableDate(row.voided_at),
		voidReason: row.void_reason,
		version: row.version,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function attendanceAdjustmentFromSql(
	row: AttendanceAdjustmentSqlRow,
): typeof hrAttendanceAdjustment.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		eventId: row.event_id,
		sequence: row.sequence,
		eventVersionBefore: row.event_version_before,
		eventVersionAfter: row.event_version_after,
		previousOccurredAt: parseDate(row.previous_occurred_at),
		newOccurredAt: parseDate(row.new_occurred_at),
		previousNotes: row.previous_notes,
		newNotes: row.new_notes,
		adjustmentReason: row.adjustment_reason,
		evidenceReference: row.evidence_reference,
		actorUserId: row.actor_user_id,
		correlationId: row.correlation_id,
		createdAt: parseDate(row.created_at),
	};
}

export function attendanceExceptionFromSql(
	row: AttendanceExceptionSqlRow,
): typeof hrAttendanceException.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		sessionId: row.session_id,
		eventId: row.event_id,
		shiftAssignmentId: row.shift_assignment_id,
		exceptionType: row.exception_type,
		severity: row.severity,
		detectedFacts: row.detected_facts,
		reviewStatus: row.review_status,
		resolution: row.resolution,
		reviewerUserId: row.reviewer_user_id,
		evidenceReference: row.evidence_reference,
		remarks: row.remarks,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function attendanceSessionFromSql(
	row: AttendanceSessionSqlRow,
): typeof hrAttendanceSession.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		employmentId: row.employment_id,
		shiftAssignmentId: row.shift_assignment_id,
		localWorkDate: row.local_work_date,
		timezone: row.timezone,
		firstClockInAt: parseNullableDate(row.first_clock_in_at),
		finalClockOutAt: parseNullableDate(row.final_clock_out_at),
		breakMinutes: row.break_minutes,
		workedMinutes: row.worked_minutes,
		grossMinutes: row.gross_minutes,
		provenance: row.provenance,
		resolutionStatus: row.resolution_status,
		requiresReview: row.requires_review,
		version: row.version,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function attendanceBreakWaiverDecisionFromSql(
	row: AttendanceBreakWaiverDecisionSqlRow,
): typeof hrAttendanceBreakWaiverDecision.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		sessionId: row.session_id,
		policyId: row.policy_id,
		authorityAssignmentId: row.authority_assignment_id,
		authority: row.authority,
		actorUserId: row.actor_user_id,
		reason: row.reason,
		evidenceReference: row.evidence_reference,
		automaticBreakMinutes: row.automatic_break_minutes,
		recordedBreakMinutes: row.recorded_break_minutes,
		sessionVersion: row.session_version,
		correlationId: row.correlation_id,
		decidedAt: parseDate(row.decided_at),
		createdAt: parseDate(row.created_at),
	};
}

export function timesheetFromSql(
	row: TimesheetSqlRow,
): typeof hrTimesheet.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		employmentId: row.employment_id,
		periodStart: row.period_start,
		periodEnd: row.period_end,
		status: row.status,
		totalRecordedMinutes: row.total_recorded_minutes,
		totalApprovedMinutes: row.total_approved_minutes,
		submittedAt: parseNullableDate(row.submitted_at),
		submissionReference: row.submission_reference,
		approvalPolicyId: row.approval_policy_id,
		requiredApprovalSteps: row.required_approval_steps,
		completedApprovalSteps: row.completed_approval_steps,
		approvedAt: parseNullableDate(row.approved_at),
		approvedBy: row.approved_by,
		returnedAt: parseNullableDate(row.returned_at),
		rejectedAt: parseNullableDate(row.rejected_at),
		lockedAt: parseNullableDate(row.locked_at),
		approverNotes: row.approver_notes,
		rejectionReason: row.rejection_reason,
		supersedesTimesheetId: row.supersedes_timesheet_id,
		version: row.version,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: parseDate(row.created_at),
		updatedAt: parseDate(row.updated_at),
	};
}

export function timesheetApprovalDecisionFromSql(
	row: TimesheetApprovalDecisionSqlRow,
): typeof hrTimesheetApprovalDecision.$inferSelect {
	return {
		id: row.id,
		organizationId: row.organization_id,
		timesheetId: row.timesheet_id,
		submissionReference: row.submission_reference,
		policyId: row.policy_id,
		authorityAssignmentId: row.authority_assignment_id,
		stepIndex: row.step_index,
		authority: row.authority,
		actorUserId: row.actor_user_id,
		comment: row.comment,
		versionApproved: row.version_approved,
		correlationId: row.correlation_id,
		decidedAt: parseDate(row.decided_at),
		createdAt: parseDate(row.created_at),
	};
}
