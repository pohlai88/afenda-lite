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
};

export type AttendanceSourceBatch = {
	events: readonly AttendanceSourceEvent[];
	nextCursor?: string;
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
