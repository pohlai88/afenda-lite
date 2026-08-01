import { createDrizzlePayrollStore } from "./adapters/drizzle/store";
import type { PayrollCommandOptions } from "./command-options";
import { createProductionMutationPorts } from "./production-ports";
import type { PayrollCapabilityComposition } from "./public-contracts";
import { createProductionPayrollRunCalculator } from "./runs/production-run-calculator";

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
	PayrollCommandOptions
>();

/** Create one opaque Payroll execution context at the application composition root. */
export function createPayrollCapabilityOptions(
	composition: PayrollCapabilityComposition,
): PayrollCapabilityOptions {
	const store = createDrizzlePayrollStore();
	const context = Object.freeze({
		[PAYROLL_CONTEXT]: true,
	} satisfies PayrollCapabilityOptions);

	internalOptions.set(context, {
		authorization: composition.authorization,
		employees: composition.workforce,
		...(composition.observability === undefined
			? {}
			: { observability: composition.observability }),
		store,
		ports: createProductionMutationPorts(),
		calculator: createProductionPayrollRunCalculator({
			store,
			employees: composition.workforce,
		}),
	});

	return context;
}

export function resolvePayrollCapabilityOptions(
	context: PayrollCapabilityOptions,
): PayrollCommandOptions {
	const options = internalOptions.get(context);
	if (options === undefined) {
		throw new TypeError(
			"Payroll operations require a context created by createPayrollCapabilityOptions().",
		);
	}
	return options;
}
