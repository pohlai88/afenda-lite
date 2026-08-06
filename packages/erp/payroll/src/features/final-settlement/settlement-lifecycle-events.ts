import {
	PAYROLL_FINAL_SETTLEMENT_CALCULATED_EVENT,
	PAYROLL_FINAL_SETTLEMENT_FINALIZED_EVENT,
	PAYROLL_FINAL_SETTLEMENT_INITIATED_EVENT,
	type PayrollEntityPayload,
	type PayrollEventType,
} from "@afenda/events/schemas";

import type { PayrollFinalSettlementStatus } from "./contract";

export const PAYROLL_FINAL_SETTLEMENT_LIFECYCLE_EVENTS = [
	PAYROLL_FINAL_SETTLEMENT_INITIATED_EVENT,
	PAYROLL_FINAL_SETTLEMENT_CALCULATED_EVENT,
	PAYROLL_FINAL_SETTLEMENT_FINALIZED_EVENT,
] as const satisfies readonly PayrollEventType[];

const SETTLEMENT_EVENT_BY_STATUS = {
	initiated: PAYROLL_FINAL_SETTLEMENT_INITIATED_EVENT,
	clearance_required: PAYROLL_FINAL_SETTLEMENT_INITIATED_EVENT,
	calculated: PAYROLL_FINAL_SETTLEMENT_CALCULATED_EVENT,
	finalized: PAYROLL_FINAL_SETTLEMENT_FINALIZED_EVENT,
} as const satisfies Record<PayrollFinalSettlementStatus, PayrollEventType>;

export function payrollFinalSettlementEventForStatus(
	status: PayrollFinalSettlementStatus,
): PayrollEventType {
	return SETTLEMENT_EVENT_BY_STATUS[status];
}

export function buildPayrollFinalSettlementEventPayload(input: {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
	settlementId: string;
}): PayrollEntityPayload {
	return {
		organizationId: input.organizationId,
		entityType: "payroll_final_settlement",
		entityId: input.settlementId,
		actorId: input.actorUserId,
		correlationId: input.correlationId,
	};
}
