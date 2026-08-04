import {
	PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_RUN_STARTED_EVENT,
	type PayrollEventType,
} from "@afenda/events/schemas";

import {
	PAYROLL_COMMAND_RUN_CALCULATE,
	PAYROLL_COMMAND_RUN_CREATE,
	PAYROLL_COMMAND_RUN_FINALIZE,
	PAYROLL_COMMAND_RUN_REVERSE,
	type PayrollCommandId,
} from "../operations/module-ids";

/**
 * Canonical Payroll emission registry (bridging B4).
 *
 * Event name strings are owned by `@afenda/events/schemas`. This registry owns
 * the payroll-local mapping from each emitted event to the command that
 * produces it and the registered dispatcher (null until platform outbox drain
 * lands — B6).
 */
export type PayrollEmissionEntry = Readonly<{
	dispatcher: string | null;
	emittedBy: PayrollCommandId;
	event: PayrollEventType;
}>;

export const PAYROLL_EMISSION_REGISTRY = [
	{
		event: PAYROLL_RUN_STARTED_EVENT,
		emittedBy: PAYROLL_COMMAND_RUN_CREATE,
		dispatcher: null,
	},
	{
		event: PAYROLL_RUN_CALCULATED_EVENT,
		emittedBy: PAYROLL_COMMAND_RUN_CALCULATE,
		dispatcher: null,
	},
	{
		event: PAYROLL_RUN_FINALIZED_EVENT,
		emittedBy: PAYROLL_COMMAND_RUN_FINALIZE,
		dispatcher: null,
	},
	{
		event: PAYROLL_PAYMENT_REQUESTED_EVENT,
		emittedBy: PAYROLL_COMMAND_RUN_FINALIZE,
		dispatcher: null,
	},
	{
		event: PAYROLL_POSTING_REQUESTED_EVENT,
		emittedBy: PAYROLL_COMMAND_RUN_FINALIZE,
		dispatcher: null,
	},
	{
		event: PAYROLL_RUN_REVERSED_EVENT,
		emittedBy: PAYROLL_COMMAND_RUN_REVERSE,
		dispatcher: null,
	},
	{
		event: PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
		emittedBy: PAYROLL_COMMAND_RUN_REVERSE,
		dispatcher: null,
	},
	{
		event: PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
		emittedBy: PAYROLL_COMMAND_RUN_REVERSE,
		dispatcher: null,
	},
] as const satisfies readonly PayrollEmissionEntry[];

export const PAYROLL_EMITTED_EVENTS = PAYROLL_EMISSION_REGISTRY.map(
	({ event }) => event,
);
