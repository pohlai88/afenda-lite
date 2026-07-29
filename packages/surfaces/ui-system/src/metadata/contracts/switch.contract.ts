import { defineManifestContract } from "./manifest.contract";

export const switchContract = defineManifestContract({
	id: "ui.switch.contract",
	component: "ui.switch",
	purpose:
		"Provides an immediately understandable on-or-off ERP setting control — notification delivery, approval digests, routing toggles — without owning persistence, permissions, or failure recovery.",
	ownership: {
		componentOwns: [
			"Switch interaction, checked presentation, approved sizes, and native-equivalent switch semantics.",
		],
		consumerOwns: [
			"Setting meaning, controlled value, save behavior, permissions, and failure recovery.",
		],
	},
	semanticBoundaries: [
		"On presentation does not prove that a remote setting was persisted.",
		"Disabled presentation does not determine whether the setting is unauthorized or unavailable.",
		"Switch does not replace Checkbox for form-confirmed choices, Button for commands, or Dialog for destructive confirmation.",
	],
	approvedSizes: {
		default: {
			meaning: "Standard switch target.",
			allowedWhen: ["The setting appears in an ordinary form or settings row."],
		},
		sm: {
			meaning: "Compact switch target.",
			allowedWhen: [
				"A dense settings context retains a clear label and usable target.",
			],
		},
	},
	rules: [
		"Use Switch for a setting whose on and off meanings are immediately clear.",
		"Label the setting rather than the action used to change it.",
		"Use Checkbox when the value is confirmed as part of a larger form submission.",
		"Prefer Card composition for operator preference and routing panels.",
		"Communicate save failures outside the visual switch position.",
	],
	accessibility: [
		"Provide an associated label and preserve checked, disabled, and invalid semantics.",
		"Keep keyboard activation and visible focus available.",
		"Communicate save failures outside the visual switch position.",
		"Do not communicate on/off state through colour alone.",
	],
	prohibitedUsage: [
		"Do not use Switch for destructive or confirmation-requiring commands.",
		"Do not optimistically conceal persistence failures.",
		"Do not use unlabeled switch controls.",
		"Do not use Switch as a substitute for Checkbox in multi-field form submits.",
	],
});
