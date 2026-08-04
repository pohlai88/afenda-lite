import {
	createFixedPayrollClock,
	createJurisdictionPayrollCurrency,
	createPayrollCalendar,
	createPayrollCapabilityOptions,
	createRegistryPayrollStatutory,
	type PayrollAuthorizationCapability,
	type PayrollWorkforceCapability,
} from "@afenda/payroll";

declare const authorization: PayrollAuthorizationCapability;
declare const workforce: PayrollWorkforceCapability;

const clock = createFixedPayrollClock({
	now: new Date("2025-01-15T00:00:00.000Z"),
});
const currency = createJurisdictionPayrollCurrency();
const statutory = createRegistryPayrollStatutory();

const context = createPayrollCapabilityOptions({
	authorization,
	clock,
	currency,
	statutory,
	workforce,
});

const acceptedOperation = createPayrollCalendar({}, context);

// @ts-expect-error The permanent facade rejects structurally forged contexts.
const rejectedContext = createPayrollCalendar({}, {});

// @ts-expect-error Infrastructure is not available through the opaque context.
const infrastructureLeak = context.store;

createPayrollCapabilityOptions({
	authorization,
	clock,
	currency,
	statutory,
	workforce,
	// @ts-expect-error Consumers cannot inject a store into production composition.
	store: {},
});

// PRD R1: workforce facts default to the accepted-handoff ledger, so the
// composition root may omit the workforce override. Clock, currency, and
// statutory remain required composition inputs (bridging B3).
createPayrollCapabilityOptions({
	authorization,
	clock,
	currency,
	statutory,
});

export type PayrollPublicContractCompileFixture = [
	typeof acceptedOperation,
	typeof rejectedContext,
	typeof infrastructureLeak,
];
