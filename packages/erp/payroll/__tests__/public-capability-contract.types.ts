import {
	createPayrollCalendar,
	createPayrollCapabilityOptions,
	type PayrollAuthorizationCapability,
	type PayrollWorkforceCapability,
} from "@afenda/payroll";

declare const authorization: PayrollAuthorizationCapability;
declare const workforce: PayrollWorkforceCapability;

const context = createPayrollCapabilityOptions({ authorization, workforce });

const acceptedOperation = createPayrollCalendar({}, context);

// @ts-expect-error The permanent facade rejects structurally forged contexts.
const rejectedContext = createPayrollCalendar({}, {});

// @ts-expect-error Infrastructure is not available through the opaque context.
const infrastructureLeak = context.store;

createPayrollCapabilityOptions({
	authorization,
	workforce,
	// @ts-expect-error Consumers cannot inject a store into production composition.
	store: {},
});

// PRD R1: workforce facts default to the accepted-handoff ledger, so the
// composition root may omit the capability entirely.
createPayrollCapabilityOptions({ authorization });

export type PayrollPublicContractCompileFixture = [
	typeof acceptedOperation,
	typeof rejectedContext,
	typeof infrastructureLeak,
];
