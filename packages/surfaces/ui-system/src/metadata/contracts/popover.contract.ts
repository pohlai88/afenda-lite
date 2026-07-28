import { defineManifestContract } from "./manifest.contract";

export const popoverContract = defineManifestContract({
	id: "ui.popover.contract",
	component: "ui.popover",
	purpose:
		"Provides a non-modal trigger-bound surface for compact contextual information or controls.",
	ownership: {
		componentOwns: [
			"Popover disclosure, anchoring, positioning, focus behavior, labelled content, and dismissal mechanics.",
		],
		consumerOwns: [
			"Content, action behavior, validation, authorization, open-state policy, and persistence.",
		],
	},
	semanticBoundaries: [
		"Popover visibility does not imply selection, commitment, or authorization.",
		"Non-modal presentation does not protect unfinished work from outside interaction.",
	],
	rules: [
		"Use Popover for compact contextual work tied to one trigger or anchor.",
		"Provide a title or accessible label when content purpose is not obvious.",
		"Use Dialog or Sheet when the workflow requires modal focus or substantial space.",
	],
	accessibility: [
		"Give the trigger an accessible name and expanded relationship.",
		"Manage focus predictably when interactive content opens and closes.",
		"Keep keyboard dismissal and visible focus available.",
	],
	prohibitedUsage: [
		"Do not use Popover for consequential confirmation.",
		"Do not place long or complex forms in a compact popover.",
		"Do not dismiss unsaved input without feature-owned handling.",
	],
});
