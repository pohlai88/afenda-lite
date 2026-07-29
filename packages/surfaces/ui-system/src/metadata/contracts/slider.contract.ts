import { defineManifestContract } from "./manifest.contract";

export const sliderContract = defineManifestContract({
	id: "ui.slider.contract",
	component: "ui.slider",
	purpose:
		"Provides pointer and keyboard adjustment of one or more ERP values within a bounded numeric range — allocation percentages, discount caps, or risk thresholds — when approximate rapid adjustment is appropriate.",
	ownership: {
		componentOwns: [
			"Slider interaction, thumb positioning, range presentation, and native-equivalent value semantics.",
		],
		consumerOwns: [
			"Minimum, maximum, step, units, controlled values, validation, and domain precision.",
		],
	},
	semanticBoundaries: [
		"Thumb position does not communicate an exact business value without textual value output.",
		"Configured bounds do not establish domain authorization or acceptable persisted values.",
		"Slider does not own NumericInput precision policy or StatusBadge lifecycle.",
	],
	rules: [
		"Use Slider when approximate or rapidly adjustable bounded input is appropriate.",
		"Display the current value and units when exact interpretation matters.",
		"Use NumericInput / MoneyInput when precise entry is the primary task.",
		"Prefer a single thumb for one value; use a dual-thumb range only when the domain is a true min–max band.",
		"Keep step aligned with domain rounding policy declared by the feature.",
	],
	accessibility: [
		"Provide an accessible label and expose current, minimum, maximum, and step semantics.",
		"Support arrow-key adjustment and retain visible focus for each thumb.",
		"Expose units and formatted value text when raw numbers are insufficient.",
		"Do not rely on track fill color alone to communicate the value.",
	],
	prohibitedUsage: [
		"Do not use Slider for unbounded values.",
		"Do not rely on position or color alone to communicate an exact value.",
		"Do not hide domain rounding or conversion inside the primitive.",
		"Do not use Slider as a substitute for Progress when the value is read-only completion.",
	],
});
