import type { Result } from "@afenda/errors/result";

import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesLeaveRequestId,
	HumanResourcesLeaveRequestSegmentId,
	HumanResourcesShiftAssignmentId,
} from "../../brands";
import type { DayPortion } from "../../shared/leave-status";
import type { AttendanceEventType } from "../../types";

/**
 * Approved leave fact consumed by Time (timesheet generation / absence).
 * Leave owns approval and balances; Time never mutates them.
 *
 * `workDate` is the leave segment civil date. `timezone` is the IANA display timezone from the
 * resolved employment work calendar for that segment date (fail-closed when calendar lookup is
 * wired). Payroll handoff minute totals omit timezone — consumers read entry `timezone`.
 */
export type ApprovedLeaveFact = {
	requestId: HumanResourcesLeaveRequestId;
	segmentId: HumanResourcesLeaveRequestSegmentId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	workDate: string;
	timezone: string;
	paid: boolean;
	approvedMinutes: number;
	dayPortion: DayPortion;
};

export type ApprovedLeaveQueryPort = {
	listApprovedLeaveForEmployeePeriod(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		periodStart: string;
		periodEnd: string;
	}): Promise<Result<readonly ApprovedLeaveFact[]>>;
};

/**
 * External attendance event after adapter mapping (employee identity resolved).
 * HR package does not implement biometric/device drivers.
 */
export type AttendanceSourceEvent = {
	sourceReference: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId?: HumanResourcesEmploymentId | null;
	shiftAssignmentId?: HumanResourcesShiftAssignmentId | null;
	eventType: AttendanceEventType;
	occurredAt: string;
	sourceTimezone: string;
	localWorkDate: string;
	locationKey?: string | null;
	deviceMetadata?: Record<string, unknown> | null;
	payloadChecksum?: string | null;
	notes?: string | null;
	sourceSequence?: number;
};

export type AttendanceSourceRejectedRow = {
	rowIndex: number;
	sourceReference: string;
	errorCode:
		| "DUPLICATE_SOURCE_REFERENCE"
		| "INVALID_TIMEZONE"
		| "INVALID_EVENT_ROW";
	errorMessage: string;
};

export type AttendanceSourceBatch = {
	events: readonly AttendanceSourceEvent[];
	nextCursor?: string;
	rejectedRows?: readonly AttendanceSourceRejectedRow[];
};

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

export type AttendanceSourcePreviewResult = {
	mode: "preview";
	organizationId: string;
	reconciliationKey: string;
	rows: readonly AttendanceSourcePreviewRow[];
	totals: {
		accepted: number;
		rejected: number;
	};
	nextCursor?: string;
};

/**
 * Thin pull transport wired at composition root. HR does not implement device drivers.
 */
export type AttendanceConnectorPullPort = {
	pull(input: { organizationId: string; cursor?: string }): Promise<
		Result<{
			events: readonly AttendanceSourceEvent[];
			nextCursor?: string;
		}>
	>;
};

/**
 * Port for pulling attendance from approved external systems.
 * Wired at composition root; optional when import command receives inline events.
 */
export type AttendanceSourcePort = {
	fetchEvents(input: {
		organizationId: string;
		cursor?: string;
	}): Promise<Result<AttendanceSourceBatch>>;
	previewEvents(input: {
		organizationId: string;
		cursor?: string;
	}): Promise<Result<AttendanceSourcePreviewResult>>;
};

export type EmployeeAssignmentContext = {
	employmentId: string;
	employeeId: string;
	departmentId: string | null;
	locationKey: string | null;
	legalEntityKey: string | null;
};

export type AssignmentContextQueryPort = {
	resolveAsOf(input: {
		organizationId: string;
		employeeId: string;
		employmentId: string;
		asOf: string;
	}): Promise<Result<EmployeeAssignmentContext>>;
};
