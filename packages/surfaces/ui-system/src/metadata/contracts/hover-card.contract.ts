import { defineManifestContract } from "./manifest.contract";

export const hoverCardContract = defineManifestContract({
	id: "ui.hover-card.contract",
	component: "ui.hover-card",
	purpose:
		"Provides optional ERP preview information associated with a stable trigger or link — supplier identity, operator context, or record summaries — without making the preview required, selected, or authorized.",
	ownership: {
		componentOwns: [
			"Hover and focus disclosure, preview positioning, delay behavior, and non-modal content presentation.",
		],
		consumerOwns: [
			"Preview content, data loading, authorization, destination behavior, and fallback access outside the preview.",
		],
	},
	semanticBoundaries: [
		"Preview visibility does not imply selection, navigation, or authorization.",
		"Hover availability does not make information accessible to keyboard or touch users by itself — focus open and non-hover fallback remain required.",
		"HoverCard does not replace Tooltip for short labels, Popover for interactive content, or Dialog for required decisions.",
	],
	rules: [
		"This contract governs HoverCard, HoverCardTrigger, and HoverCardContent as one preview family.",
		"Use HoverCard for supplemental preview content rather than required instructions or critical actions.",
		"Keep preview content concise and stable enough to inspect without nested interactive workflows.",
		"Ensure the trigger remains useful without opening the preview — labels and destinations stay on the parent surface.",
		"Prefer Avatar, Code, and StatusBadge inside the preview for identity and lifecycle — do not invent parallel status chrome.",
		"Use Tooltip when only a short label is needed; use Popover when the surface must host interactive controls.",
	],
	accessibility: [
		"Open from keyboard focus as well as pointer hover.",
		"Keep required information available outside the hover card.",
		"Avoid focusable controls when a persistent Popover or Dialog is more suitable.",
		"Do not rely on hover alone for operators using keyboard or touch.",
	],
	prohibitedUsage: [
		"Do not place critical actions, validation, or authorization only in HoverCard.",
		"Do not use HoverCard as a Tooltip substitute for short labels.",
		"Do not expose unauthorized preview data.",
		"Do not require the preview to understand the trigger destination or record identity.",
		"Do not nest forms, menus, or multi-step workflows inside HoverCard.",
	],
});
