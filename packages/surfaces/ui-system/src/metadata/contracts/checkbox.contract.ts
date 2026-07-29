import { defineManifestContract } from "./manifest.contract";

export const checkboxContract = defineManifestContract({
	id: "ui.checkbox.contract",
	component: "ui.checkbox",
	purpose:
		"Provides a binary or mixed-state control for one independently labelled ERP choice — filter inclusion, row selection, or an explicit partial-selection state.",
	ownership: {
		componentOwns: [
			"Native-equivalent checkbox interaction, checked presentation, mixed-state semantics, and focus styling.",
		],
		consumerOwns: [
			"Choice meaning, controlled value, validation, permissions, persistence, and how mixed state maps to descendant records.",
		],
	},
	semanticBoundaries: [
		"Checked presentation does not prove that a command, save, or policy change succeeded.",
		"A mixed state does not determine how descendant values are stored or updated — feature code owns selection models.",
		"Checkbox does not replace Switch for an immediate setting, RadioGroup for exclusive choice, or Button for a command.",
	],
	rules: [
		"Use Checkbox for one independent boolean choice or an explicitly supported mixed state.",
		"Pair each Checkbox with a clear Label describing the checked outcome.",
		"Use RadioGroup or Select when the operator must choose exactly one bounded option.",
		"Use Switch when the control toggles an immediate setting rather than a form choice.",
		"Explain mixed (indeterminate) state in adjacent copy when it represents partial page or group selection.",
		"Keep disabled and invalid presentation honest — do not imply a saved selection the operator cannot change.",
	],
	accessibility: [
		"Provide an associated label and preserve checked, mixed, disabled, and invalid semantics.",
		"Keep visible keyboard focus and space-key activation.",
		"Do not communicate checked or invalid state through colour alone.",
		"Ensure the accessible name describes the business outcome of checking the control.",
	],
	prohibitedUsage: [
		"Do not use Checkbox as an immediate command button.",
		"Do not render an unexplained mixed state.",
		"Do not hide authorization or save failures behind optimistic checked presentation.",
		"Do not use Checkbox for mutually exclusive options — use RadioGroup.",
		"Do not omit a visible label that names the checked outcome.",
	],
});
