import type { Result } from "@afenda/errors";
import type { AttendanceEventType } from "../../../kernel/contracts";
import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesLeaveRequestId,
	HumanResourcesLeaveRequestSegmentId,
	HumanResourcesShiftAssignmentId,
} from "../../../kernel/identity/brands";
import type { DayPortion } from "../../leave/status";

/**
 * Approved leave fact consumed by Time (timesheet generation / absence).
 * Leave owns approval and balances; Time never mutates them.
 *
 * `workDate` is the leave segment civil date. `timezone` is the IANA display timezone from the
 * resolved employment work calendar for that segment date (fail-closed when calendar lookup is
 * wired). Payroll handoff minute totals omit timezone — consumers read entry `timezone`.
 */
export interface ApprovedLeaveFact {
	approvedMinutes: number;
	dayPortion: DayPortion;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	paid: boolean;
	requestId: HumanResourcesLeaveRequestId;
	segmentId: HumanResourcesLeaveRequestSegmentId;
	timezone: string;
	workDate: string;
}

export interface ApprovedLeaveQueryPort {
	listApprovedLeaveForEmployeePeriod: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		periodStart: string;
		periodEnd: string;
	}) => Promise<Result<readonly ApprovedLeaveFact[]>>;
}

/**
 * External attendance event after adapter mapping (employee identity resolved).
 * HR package does not implement biometric/device drivers.
 */
export interface AttendanceSourceEvent {
	deviceMetadata?: Record<string, unknown> | null | undefined;
	employeeId: HumanResourcesEmployeeId;
	employmentId?: HumanResourcesEmploymentId | null | undefined;
	eventType: AttendanceEventType;
	localWorkDate: string;
	locationKey?: string | null | undefined;
	notes?: string | null | undefined;
	occurredAt: string;
	payloadChecksum?: string | null | undefined;
	shiftAssignmentId?: HumanResourcesShiftAssignmentId | null | undefined;
	sourceReference: string;
	sourceSequence?: number | undefined;
	sourceTimezone: string;
}

export interface AttendanceSourceRejectedRow {
	errorCode:
		| "DUPLICATE_SOURCE_REFERENCE"
		| "INVALID_TIMEZONE"
		| "INVALID_EVENT_ROW";
	errorMessage: string;
	rowIndex: number;
	sourceReference: string;
}

export interface AttendanceSourceBatch {
	events: readonly AttendanceSourceEvent[];
	nextCursor?: string | undefined;
	rejectedRows?: readonly AttendanceSourceRejectedRow[] | undefined;
}

export type AttendanceSourcePreviewRow =
	| {
			status: "accepted";
			rowIndex: number;
			sourceReference: string;
	  }
	| {
			status: "rejected";
			rowIndex: number;
			sourceReference: string;
			errorCode: AttendanceSourceRejectedRow["errorCode"];
			errorMessage: string;
	  };

export interface AttendanceSourcePreviewResult {
	mode: "preview";
	nextCursor?: string | undefined;
	organizationId: string;
	reconciliationKey: string;
	rows: readonly AttendanceSourcePreviewRow[];
	totals: {
		accepted: number;
		rejected: number;
	};
}

/**
 * Thin pull transport wired at composition root. HR does not implement device drivers.
 */
export interface AttendanceConnectorPullPort {
	pull: (input: {
		organizationId: string;
		cursor?: string | undefined;
	}) => Promise<
		Result<{
			events: readonly AttendanceSourceEvent[];
			nextCursor?: string | undefined;
		}>
	>;
}

/**
 * Port for pulling attendance from approved external systems.
 * Wired at composition root; optional when import command receives inline events.
 */
export interface AttendanceSourcePort {
	fetchEvents: (input: {
		organizationId: string;
		cursor?: string | undefined;
	}) => Promise<Result<AttendanceSourceBatch>>;
	previewEvents: (input: {
		organizationId: string;
		cursor?: string | undefined;
	}) => Promise<Result<AttendanceSourcePreviewResult>>;
}

export interface EmployeeAssignmentContext {
	departmentId: string | null;
	employeeId: string;
	employmentId: string;
	legalEntityKey: string | null;
	locationKey: string | null;
}

export interface AssignmentContextQueryPort {
	resolveAsOf: (input: {
		organizationId: string;
		employeeId: string;
		employmentId: string;
		asOf: string;
	}) => Promise<Result<EmployeeAssignmentContext>>;
}
