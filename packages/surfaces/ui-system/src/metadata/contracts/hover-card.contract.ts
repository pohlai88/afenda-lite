import { defineManifestContract } from "./manifest.contract";

export const hoverCardContract = defineManifestContract({
	id: "ui.hover-card.contract",
	component: "ui.hover-card",
	purpose:
		"Provides optional preview information associated with a stable trigger or link.",
	ownership: {
		componentOwns: [
			"Hover and focus disclosure, preview positioning, delay behavior, and non-modal content presentation.",
		],
		consumerOwns: [
			"Preview content, data loading, authorization, destination behavior, and fallback access.",
		],
	},
	semanticBoundaries: [
		"Preview visibility does not imply selection or navigation.",
		"Hover availability does not make information accessible to keyboard or touch users by itself.",
	],
	rules: [
		"Use HoverCard for supplemental preview content rather than required instructions.",
		"Keep preview content concise and stable enough to inspect.",
		"Ensure the trigger remains useful without opening the preview.",
	],
	accessibility: [
		"Open from keyboard focus as well as pointer hover.",
		"Keep required information available outside the hover card.",
		"Avoid focusable controls when a persistent popover or dialog is more suitable.",
	],
	prohibitedUsage: [
		"Do not place critical actions or validation only in HoverCard.",
		"Do not use HoverCard as a Tooltip substitute for short labels.",
		"Do not expose unauthorized preview data.",
	],
});
