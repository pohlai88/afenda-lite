import { defineManifestContract } from "./manifest.contract";

export const numericInputContract = defineManifestContract({
	id: "ui.numeric-input.contract",
	component: "ui.numeric-input",
	purpose:
		"Provides specialized ERP entry for numbers, money, quantities, and percentages with explicit formatting affordances — display chrome, not accounting precision policy.",
	ownership: {
		componentOwns: [
			"Numeric text entry, primitive parsing callbacks, display formatting, stepping, and unit or currency affordance presentation.",
		],
		consumerOwns: [
			"Precision, currency, unit, scale, rounding, bounds, validation, authorization, and persistence.",
		],
	},
	semanticBoundaries: [
		"Formatted display does not determine authoritative decimal precision or rounding policy.",
		"Money, quantity, and percentage wrappers do not derive currency, unit, or business meaning from locale alone.",
		"Prefix and suffix chrome does not authorize amounts, convert currencies, or validate tax rules.",
	],
	rules: [
		"Choose NumberInput, MoneyInput, QuantityInput, or PercentInput according to the domain value kind.",
		"Declare units, currency, scale, bounds, and precision from feature policy — never invent them in the control.",
		"Associate each numeric control with a visible FormField label, unit context, description, and error.",
		"Preserve the user's entered value when parsing or validation fails.",
		"Use MoneyInput for monetary amounts, QuantityInput for counted stock or units, PercentInput for rates, and NumberInput for generic scalars.",
	],
	accessibility: [
		"Associate each numeric control with a visible label, unit context, description, and error.",
		"Expose minimum, maximum, invalid, disabled, and read-only semantics when applicable.",
		"Ensure formatted values remain understandable to assistive technologies without relying on prefix or suffix alone.",
	],
	prohibitedUsage: [
		"Do not use floating-point display behavior as accounting precision policy.",
		"Do not infer currency or unit from locale alone.",
		"Do not silently clamp, round, or rescale values without predictable feature policy.",
		"Do not use a bare NumberInput where MoneyInput, QuantityInput, or PercentInput communicates the domain kind.",
		"Do not rely on placeholder text as the only label or unit instruction.",
	],
});
