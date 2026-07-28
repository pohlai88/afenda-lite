import { defineManifestContract } from "./manifest.contract";

export const checkboxContract = defineManifestContract({
	id: "ui.checkbox.contract",
	component: "ui.checkbox",
	purpose:
		"Provides a binary or mixed-state control for one independently labelled choice.",
	ownership: {
		componentOwns: [
			"Native-equivalent checkbox interaction, checked presentation, and mixed-state semantics.",
		],
		consumerOwns: [
			"Choice meaning, controlled value, validation, permissions, and persistence.",
		],
	},
	semanticBoundaries: [
		"Checked presentation does not prove that a command or policy change succeeded.",
		"A mixed state does not determine how descendant values are stored or updated.",
	],
	rules: [
		"Use Checkbox for one independent boolean choice or an explicitly supported mixed state.",
		"Pair each checkbox with a clear label describing the checked outcome.",
		"Use RadioGroup or Select when the user must choose exactly one bounded option.",
	],
	accessibility: [
		"Provide an associated label and preserve checked, mixed, disabled, and invalid semantics.",
		"Keep visible keyboard focus and space-key activation.",
		"Do not communicate checked or invalid state through color alone.",
	],
	prohibitedUsage: [
		"Do not use Checkbox as an immediate command button.",
		"Do not render an unexplained mixed state.",
		"Do not hide authorization or save failures behind optimistic checked presentation.",
	],
});
