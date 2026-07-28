import { defineManifestContract } from "./manifest.contract";

export const sliderContract = defineManifestContract({
	id: "ui.slider.contract",
	component: "ui.slider",
	purpose:
		"Provides pointer and keyboard adjustment of one or more values within a bounded numeric range.",
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
	],
	rules: [
		"Use Slider when approximate or rapidly adjustable bounded input is appropriate.",
		"Display the current value and units when exact interpretation matters.",
		"Use NumericInput when precise entry is the primary task.",
	],
	accessibility: [
		"Provide an accessible label and expose current, minimum, maximum, and step semantics.",
		"Support arrow-key adjustment and retain visible focus for each thumb.",
		"Expose units and formatted value text when raw numbers are insufficient.",
	],
	prohibitedUsage: [
		"Do not use Slider for unbounded values.",
		"Do not rely on position or color alone to communicate an exact value.",
		"Do not hide domain rounding or conversion inside the primitive.",
	],
});
