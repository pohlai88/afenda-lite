import type { HumanResourcesCommandId } from "../module-ids";

import type { HumanResourcesDomain } from "./types";

interface EmissionMetadata {
	aggregateType: string;
	domain: HumanResourcesDomain;
}

interface EmissionMetadataRule extends EmissionMetadata {
	commandFragment: string;
}

const EMISSION_METADATA_RULES: readonly EmissionMetadataRule[] = [
	{
		commandFragment: ".document-requirement.",
		domain: "compliance",
		aggregateType: "document_requirement",
	},
	{
		commandFragment: ".employee-document.",
		domain: "compliance",
		aggregateType: "employee_document",
	},
	{
		commandFragment: ".work-eligibility.",
		domain: "compliance",
		aggregateType: "work_eligibility",
	},
	{
		commandFragment: ".policy-acknowledgement.",
		domain: "compliance",
		aggregateType: "policy_acknowledgement",
	},
	{
		commandFragment: ".certification.",
		domain: "learning",
		aggregateType: "certification",
	},
	{
		commandFragment: ".completion.",
		domain: "learning",
		aggregateType: "learning_completion",
	},
	{
		commandFragment: ".work-calendar.",
		domain: "time",
		aggregateType: "work_calendar",
	},
	{
		commandFragment: ".employment-calendar.",
		domain: "time",
		aggregateType: "employment_calendar",
	},
	{
		commandFragment: ".time-policy.",
		domain: "time",
		aggregateType: "time_policy",
	},
	{
		commandFragment: ".time-approval-authority.",
		domain: "time",
		aggregateType: "time_approval_authority",
	},
	{
		commandFragment: ".shift-assignment.",
		domain: "time",
		aggregateType: "shift_assignment",
	},
	{ commandFragment: ".shift.", domain: "time", aggregateType: "shift" },
	{
		commandFragment: ".attendance-exception.",
		domain: "time",
		aggregateType: "attendance_exception",
	},
	{
		commandFragment: ".attendance-session.",
		domain: "time",
		aggregateType: "attendance_session",
	},
	{
		commandFragment: ".attendance-break-waiver.",
		domain: "time",
		aggregateType: "attendance_break_waiver",
	},
	{
		commandFragment: ".attendance-events.",
		domain: "time",
		aggregateType: "attendance_event_batch",
	},
	{
		commandFragment: ".attendance-event.",
		domain: "time",
		aggregateType: "attendance_event",
	},
	{
		commandFragment: ".timesheet-entry.",
		domain: "time",
		aggregateType: "timesheet_entry",
	},
	{
		commandFragment: ".timesheet.",
		domain: "time",
		aggregateType: "timesheet",
	},
	{
		commandFragment: ".overtime-request.",
		domain: "time",
		aggregateType: "overtime_request",
	},
	{
		commandFragment: ".leave-policy.",
		domain: "leave",
		aggregateType: "leave_policy",
	},
	{
		commandFragment: ".leave-entitlement.",
		domain: "leave",
		aggregateType: "leave_entitlement",
	},
	{
		commandFragment: ".leave-request.",
		domain: "leave",
		aggregateType: "leave_request",
	},
	{
		commandFragment: ".leave-adjustment.",
		domain: "leave",
		aggregateType: "leave_adjustment",
	},
];

/**
 * Deterministic domain/aggregate metadata for canonical Time classifications.
 * Structural only — does not change emission mode or event types.
 */
export function inferEmissionMetadata(
	commandId: HumanResourcesCommandId,
): EmissionMetadata {
	for (const rule of EMISSION_METADATA_RULES) {
		if (commandId.includes(rule.commandFragment)) {
			return { aggregateType: rule.aggregateType, domain: rule.domain };
		}
	}

	return { aggregateType: "hr_entity", domain: "core" };
}
