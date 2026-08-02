import {
	PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_RUN_STARTED_EVENT,
	type PayrollEntityPayload,
	type PayrollEventType,
} from "@afenda/events/schemas";

import type {
	PayrollFinalizationProjection,
	PayrollReversalProjection,
	PayrollRun,
	PayrollRunStatus,
} from "../../kernel/contracts/projected-types";

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
	reversed: [
		PAYROLL_RUN_REVERSED_EVENT,
		PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
		PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
	],
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

export function buildPayrollRunEventPayloadForType(input: {
	eventType: PayrollEventType;
	actorUserId: string;
	correlationId: string;
	run: PayrollRun;
	finalizationProjection?: PayrollFinalizationProjection | undefined;
	reversalProjection?: PayrollReversalProjection | undefined;
}): Record<string, unknown> {
	const base = buildPayrollRunEventPayload({
		organizationId: input.run.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		runId: input.run.id,
	});
	if (
		input.eventType === PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT ||
		input.eventType === PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT
	) {
		const projection = input.reversalProjection;
		if (
			projection === undefined ||
			input.run.calculationSnapshotHash === null ||
			input.run.calculationVersion === null
		) {
			return base;
		}
		const correctionBase = {
			...base,
			payGroupId: input.run.payGroupId,
			periodId: input.run.periodId,
			calculationSnapshotHash: input.run.calculationSnapshotHash,
			calculationVersion: input.run.calculationVersion,
			originalRunId: input.run.id,
			reasonCode: projection.reasonCode,
		};
		if (input.eventType === PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT) {
			return {
				...correctionBase,
				paymentDate: projection.paymentDate,
				payments: projection.payments,
			};
		}
		return {
			...correctionBase,
			postingDate: projection.postingDate,
			lines: projection.postingLines,
		};
	}
	if (
		input.eventType !== PAYROLL_RUN_FINALIZED_EVENT &&
		input.eventType !== PAYROLL_PAYMENT_REQUESTED_EVENT &&
		input.eventType !== PAYROLL_POSTING_REQUESTED_EVENT
	) {
		return base;
	}
	const projection = input.finalizationProjection;
	if (
		projection === undefined ||
		input.run.calculationSnapshotHash === null ||
		input.run.calculationVersion === null
	) {
		return base;
	}
	const finalizationBase = {
		...base,
		payGroupId: input.run.payGroupId,
		periodId: input.run.periodId,
		calculationSnapshotHash: input.run.calculationSnapshotHash,
		calculationVersion: input.run.calculationVersion,
	};
	if (input.eventType === PAYROLL_RUN_FINALIZED_EVENT) {
		return { ...finalizationBase, totals: projection.totals };
	}
	if (input.eventType === PAYROLL_PAYMENT_REQUESTED_EVENT) {
		return {
			...finalizationBase,
			paymentDate: projection.paymentDate,
			payments: projection.payments,
		};
	}
	return {
		...finalizationBase,
		postingDate: projection.postingDate,
		lines: projection.postingLines,
	};
}
