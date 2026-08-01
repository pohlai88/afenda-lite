import {
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_RUN_STARTED_EVENT,
	type PayrollEntityPayload,
	type PayrollEventType,
} from "@afenda/events/schemas";

import type { PayrollRunStatus } from "../types";

const RUN_EVENTS_BY_STATUS = {
	draft: [PAYROLL_RUN_STARTED_EVENT],
	calculating: [],
	calculated: [PAYROLL_RUN_CALCULATED_EVENT],
	failed: [],
	finalized: [
		PAYROLL_RUN_FINALIZED_EVENT,
		PAYROLL_PAYMENT_REQUESTED_EVENT,
		PAYROLL_POSTING_REQUESTED_EVENT,
	],
	reversed: [PAYROLL_RUN_REVERSED_EVENT],
} as const satisfies Record<PayrollRunStatus, readonly PayrollEventType[]>;

export function payrollRunEventsForStatus(
	status: PayrollRunStatus,
): readonly PayrollEventType[] {
	return RUN_EVENTS_BY_STATUS[status];
}

export function buildPayrollRunEventPayload(input: {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
	runId: string;
}): PayrollEntityPayload {
	return {
		organizationId: input.organizationId,
		entityType: "payroll_run",
		entityId: input.runId,
		actorId: input.actorUserId,
		correlationId: input.correlationId,
	};
}
