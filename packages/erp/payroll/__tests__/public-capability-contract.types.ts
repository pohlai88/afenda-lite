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
	// @ts-expect-error Consumers cannot inject a store into production composition.
	store: {},
});

createPayrollCapabilityOptions({
	authorization,
	clock,
	currency,
	statutory,
	// @ts-expect-error B1 closed: production composition has no pull-workforce override.
	workforce,
});

export type PayrollPublicContractCompileFixture = [
	typeof acceptedOperation,
	typeof rejectedContext,
	typeof infrastructureLeak,
];
