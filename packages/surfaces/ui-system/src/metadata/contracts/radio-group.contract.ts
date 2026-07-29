import { defineManifestContract } from "./manifest.contract";

export const radioGroupContract = defineManifestContract({
	id: "ui.radio-group.contract",
	component: "ui.radio-group",
	purpose:
		"Provides single selection from a small mutually exclusive ERP option group — posting frequency, settlement method, or similar policy choices.",
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
		"RadioGroup does not replace Checkbox for independent booleans or Select for large option sets.",
	],
	rules: [
		"Use RadioGroup when exactly one of a small set of visible options may be selected.",
		"Give the group one shared label and each item its own distinct label.",
		"Use Select or Combobox when the option set is too large for simultaneous display.",
		"Keep values stable domain identifiers — not display labels.",
		"Place disabled options only when the choice exists but is currently unavailable.",
	],
	accessibility: [
		"Provide group semantics through a labelled fieldset or equivalent relationship.",
		"Preserve arrow-key navigation, checked state, and visible focus.",
		"Associate group-level validation feedback with the group.",
		"Do not rely on color alone to communicate the selected option.",
	],
	prohibitedUsage: [
		"Do not use RadioGroup for independent boolean choices — use Checkbox or Switch.",
		"Do not render an unlabeled option or group.",
		"Do not treat hidden client options as authorization enforcement.",
		"Do not use RadioGroup for multi-select filters.",
		"Do not substitute RadioGroup for StatusBadge lifecycle state.",
	],
});
