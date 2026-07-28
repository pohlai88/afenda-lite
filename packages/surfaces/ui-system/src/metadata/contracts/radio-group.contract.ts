import { defineManifestContract } from "./manifest.contract";

export const radioGroupContract = defineManifestContract({
	id: "ui.radio-group.contract",
	component: "ui.radio-group",
	purpose:
		"Provides single selection from a small mutually exclusive option group.",
	ownership: {
		componentOwns: [
			"Radio-group interaction, roving focus, selected presentation, and item semantics.",
		],
		consumerOwns: [
			"Group label, option meaning, stable values, validation, permissions, and persistence.",
		],
	},
	semanticBoundaries: [
		"Selected presentation does not prove that a domain change has been accepted.",
		"A visible radio option does not imply authorization or eligibility.",
	],
	rules: [
		"Use RadioGroup when exactly one of a small set of visible options may be selected.",
		"Give the group one shared label and each item its own distinct label.",
		"Use Select or Combobox when the option set is too large for simultaneous display.",
	],
	accessibility: [
		"Provide group semantics through a labelled fieldset or equivalent relationship.",
		"Preserve arrow-key navigation, checked state, and visible focus.",
		"Associate group-level validation feedback with the group.",
	],
	prohibitedUsage: [
		"Do not use RadioGroup for independent boolean choices.",
		"Do not render an unlabeled option or group.",
		"Do not treat hidden client options as authorization enforcement.",
	],
});
