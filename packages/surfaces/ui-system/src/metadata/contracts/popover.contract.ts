import { defineManifestContract } from "./manifest.contract";

export const popoverContract = defineManifestContract({
	id: "ui.popover.contract",
	component: "ui.popover",
	purpose:
		"Provides a non-modal, trigger-bound surface for compact ERP contextual information or lightweight controls tied to one anchor.",
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
		"A compact popover does not replace Dialog, Sheet, or AlertDialog for focused or consequential workflows.",
	],
	rules: [
		"Use Popover for compact contextual work tied to one trigger or anchor.",
		"Provide a title or accessible label when content purpose is not obvious.",
		"Use Dialog or Sheet when the workflow requires modal focus or substantial space.",
		"Keep interactive content short — filters chips, period hints, or one or two fields at most.",
		"Give the trigger a clear accessible name that describes what opens.",
	],
	accessibility: [
		"Give the trigger an accessible name and expanded relationship.",
		"Manage focus predictably when interactive content opens and closes.",
		"Keep keyboard dismissal and visible focus available.",
		"Label PopoverContent when the panel purpose is not clear from the trigger alone.",
	],
	prohibitedUsage: [
		"Do not use Popover for consequential confirmation — use AlertDialog.",
		"Do not place long or complex forms in a compact popover.",
		"Do not dismiss unsaved input without feature-owned handling.",
		"Do not use Popover as a primary page navigation surface.",
		"Do not treat open state as a committed selection or posted value.",
	],
});
