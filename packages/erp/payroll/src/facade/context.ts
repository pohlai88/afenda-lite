import { createDrizzlePayrollStore } from "../composition/adapters/drizzle";
import { createProductionMutationPorts } from "../composition/production/ports";
import { createProductionPayrollRunCalculator } from "../features/calculation/production-run-calculator";
import { createAcceptedWorkforceInputPort } from "../features/workforce-ingress/accepted-workforce-input-port";
import type { PayrollCommandOptions } from "../kernel/execution/command-options";
import type { PayrollCapabilityComposition } from "./contracts";

const PAYROLL_CONTEXT = Symbol("afenda.payroll.context");

/**
 * Permanent public execution input. The private symbol prevents consumers from
 * constructing or widening the context into Payroll infrastructure.
 */
export interface PayrollCapabilityOptions {
	readonly [PAYROLL_CONTEXT]: true;
}

const internalOptions = new WeakMap<
	PayrollCapabilityOptions,
	PayrollCommandOptions<ReturnType<typeof createDrizzlePayrollStore>>
>();

/** Create one opaque Payroll execution context at the application composition root. */
export function createPayrollCapabilityOptions(
	composition: PayrollCapabilityComposition,
): PayrollCapabilityOptions {
	const store = createDrizzlePayrollStore();
	const workforce =
		composition.workforce ?? createAcceptedWorkforceInputPort(store);
	const context = Object.freeze({
		[PAYROLL_CONTEXT]: true,
	} satisfies PayrollCapabilityOptions);

	internalOptions.set(context, {
		authorization: composition.authorization,
		employees: workforce,
		clock: composition.clock,
		currency: composition.currency,
		statutory: composition.statutory,
		...(composition.observability === undefined
			? {}
			: { observability: composition.observability }),
		...(composition.privacy === undefined
			? {}
			: { privacy: composition.privacy }),
		store,
		ports: createProductionMutationPorts(),
		calculator: createProductionPayrollRunCalculator({
			store,
			employees: workforce,
			currency: composition.currency,
			statutory: composition.statutory,
			clock: composition.clock,
		}),
	});

	return context;
}

export function resolvePayrollCapabilityOptions(
	context: PayrollCapabilityOptions,
): PayrollCommandOptions<ReturnType<typeof createDrizzlePayrollStore>> {
	const options = internalOptions.get(context);
	if (options === undefined) {
		throw new TypeError(
			"Payroll operations require a context created by createPayrollCapabilityOptions().",
		);
	}
	return options;
}
