import { defineManifestContract } from "./manifest.contract";

export const numericInputContract = defineManifestContract({
	id: "ui.numeric-input.contract",
	component: "ui.numeric-input",
	purpose:
		"Provides specialized entry for numbers, money, quantities, and percentages with explicit formatting semantics.",
	ownership: {
		componentOwns: [
			"Numeric text entry, primitive parsing callbacks, display formatting, stepping, and unit-affordance presentation.",
		],
		consumerOwns: [
			"Precision, currency, unit, scale, rounding, bounds, validation, authorization, and persistence.",
		],
	},
	semanticBoundaries: [
		"Formatted display does not determine authoritative decimal precision or rounding policy.",
		"Money, quantity, and percentage wrappers do not derive currency, unit, or business meaning.",
	],
	rules: [
		"Choose NumberInput, MoneyInput, QuantityInput, or PercentInput according to the domain value.",
		"Declare units, currency, scale, bounds, and precision from feature policy.",
		"Preserve the user's entered value when parsing or validation fails.",
	],
	accessibility: [
		"Associate each numeric control with a visible label, unit context, description, and error.",
		"Expose minimum, maximum, invalid, disabled, and read-only semantics when applicable.",
		"Ensure formatted values remain understandable to assistive technologies.",
	],
	prohibitedUsage: [
		"Do not use floating-point display behavior as accounting precision policy.",
		"Do not infer currency or unit from locale alone.",
		"Do not silently clamp, round, or rescale values without predictable feature policy.",
	],
});
