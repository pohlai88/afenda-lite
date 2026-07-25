import type { HumanResourcesCommandId } from "../module-ids";

import type { HumanResourcesDomain } from "./types";

/**
 * Deterministic domain/aggregate metadata for preserved legacy classifications.
 * Structural only — does not change emission mode or event types.
 */
export function inferEmissionMetadata(commandId: HumanResourcesCommandId): {
	domain: HumanResourcesDomain;
	aggregateType: string;
} {
	if (commandId.includes(".document-requirement.")) {
		return { domain: "compliance", aggregateType: "document_requirement" };
	}
	if (commandId.includes(".employee-document.")) {
		return { domain: "compliance", aggregateType: "employee_document" };
	}
	if (commandId.includes(".work-eligibility.")) {
		return { domain: "compliance", aggregateType: "work_eligibility" };
	}
	if (commandId.includes(".policy-acknowledgement.")) {
		return { domain: "compliance", aggregateType: "policy_acknowledgement" };
	}
	if (commandId.includes(".certification.")) {
		return { domain: "learning", aggregateType: "certification" };
	}
	if (commandId.includes(".completion.")) {
		return { domain: "learning", aggregateType: "learning_completion" };
	}
	if (commandId.includes(".work-calendar.")) {
		return { domain: "time", aggregateType: "work_calendar" };
	}
	if (commandId.includes(".employment-calendar.")) {
		return { domain: "time", aggregateType: "employment_calendar" };
	}
	if (commandId.includes(".time-policy.")) {
		return { domain: "time", aggregateType: "time_policy" };
	}
	if (commandId.includes(".time-approval-authority.")) {
		return { domain: "time", aggregateType: "time_approval_authority" };
	}
	if (commandId.includes(".shift-assignment.")) {
		return { domain: "time", aggregateType: "shift_assignment" };
	}
	if (commandId.includes(".shift.")) {
		return { domain: "time", aggregateType: "shift" };
	}
	if (commandId.includes(".attendance-exception.")) {
		return { domain: "time", aggregateType: "attendance_exception" };
	}
	if (commandId.includes(".attendance-session.")) {
		return { domain: "time", aggregateType: "attendance_session" };
	}
	if (commandId.includes(".attendance-break-waiver.")) {
		return { domain: "time", aggregateType: "attendance_break_waiver" };
	}
	if (commandId.includes(".attendance-events.")) {
		return { domain: "time", aggregateType: "attendance_event_batch" };
	}
	if (commandId.includes(".attendance-event.")) {
		return { domain: "time", aggregateType: "attendance_event" };
	}
	if (commandId.includes(".timesheet-entry.")) {
		return { domain: "time", aggregateType: "timesheet_entry" };
	}
	if (commandId.includes(".timesheet.")) {
		return { domain: "time", aggregateType: "timesheet" };
	}
	if (commandId.includes(".overtime-request.")) {
		return { domain: "time", aggregateType: "overtime_request" };
	}
	if (commandId.includes(".leave-policy.")) {
		return { domain: "leave", aggregateType: "leave_policy" };
	}
	if (commandId.includes(".leave-entitlement.")) {
		return { domain: "leave", aggregateType: "leave_entitlement" };
	}
	if (commandId.includes(".leave-request.")) {
		return { domain: "leave", aggregateType: "leave_request" };
	}
	if (commandId.includes(".leave-adjustment.")) {
		return { domain: "leave", aggregateType: "leave_adjustment" };
	}

	return { domain: "core", aggregateType: "hr_entity" };
}
