import { defineManifestContract } from "./manifest.contract";

export const switchContract = defineManifestContract({
	id: "ui.switch.contract",
	component: "ui.switch",
	purpose: "Provides an immediately understandable on-or-off setting control.",
	ownership: {
		componentOwns: [
			"Switch interaction, checked presentation, and native-equivalent switch semantics.",
		],
		consumerOwns: [
			"Setting meaning, controlled value, save behavior, permissions, and failure recovery.",
		],
	},
	semanticBoundaries: [
		"On presentation does not prove that a remote setting was persisted.",
		"Disabled presentation does not determine whether the setting is unauthorized or unavailable.",
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
	],
	accessibility: [
		"Provide an associated label and preserve checked, disabled, and invalid semantics.",
		"Keep keyboard activation and visible focus available.",
		"Communicate save failures outside the visual switch position.",
	],
	prohibitedUsage: [
		"Do not use Switch for destructive or confirmation-requiring commands.",
		"Do not optimistically conceal persistence failures.",
		"Do not use unlabeled switch controls.",
	],
});
