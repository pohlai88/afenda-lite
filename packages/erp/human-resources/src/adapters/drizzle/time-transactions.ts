/**
 * HR Time Neon HTTP transaction utilities (ARCH-025 · N12).
 *
 * Converts snake_case SQL rows from `runNeonHttpTransaction` into Drizzle
 * infer shapes consumed by the time adapter mappers.
 */

import {
	type hrAttendanceAdjustment,
	type hrAttendanceEvent,
	type hrShift,
	type hrShiftAssignment,
	type hrTimeApprovalAuthorityAssignment,
	type hrTimePolicy,
	type hrTimePolicyAssignment,
	type hrTimesheet,
	type hrTimesheetApprovalDecision,
	type hrWorkCalendar,
	type NeonHttpTransactionResults,
	runNeonHttpTransaction,
} from "@afenda/db";

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
	queriesOrFn: Parameters<typeof runNeonHttpTransaction>[0],
	options?: Parameters<typeof runNeonHttpTransaction>[1],
): Promise<NeonHttpTransactionResults> {
	return await runNeonHttpTransaction(queriesOrFn, {
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
