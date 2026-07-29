import { defineManifestContract } from "./manifest.contract";

export const tooltipContract = defineManifestContract({
	id: "ui.tooltip.contract",
	component: "ui.tooltip",
	purpose:
		"Provides brief supplemental text for an already operable and identifiable ERP trigger — truncated invoice ids, icon toolbar labels — without carrying required instructions or interactive content.",
	ownership: {
		componentOwns: [
			"Hover and focus disclosure, tooltip positioning, delay behavior, and tooltip semantics via TooltipProvider, Tooltip, TooltipTrigger, and TooltipContent.",
		],
		consumerOwns: [
			"Supplemental wording, trigger semantics, accessible naming, and suitability.",
		],
	},
	semanticBoundaries: [
		"Tooltip text does not replace a required accessible name.",
		"Hover availability does not make instructions accessible to touch users.",
		"This contract governs TooltipProvider, Tooltip, TooltipTrigger, and TooltipContent as one disclosure family.",
	],
	rules: [
		"Use Tooltip for concise supplemental clarification.",
		"Ensure the trigger remains understandable and operable without the tooltip.",
		"Keep content short enough to read without interaction.",
		"Prefer HoverCard or Popover when content needs links, forms, or multi-line guidance.",
	],
	accessibility: [
		"Open on keyboard focus as well as pointer hover.",
		"Provide the trigger's accessible name independently when the tooltip is supplemental.",
		"Allow enough time to perceive content without trapping focus.",
	],
	prohibitedUsage: [
		"Do not place critical instructions, errors, or interactive content in Tooltip.",
		"Do not use Tooltip as a HoverCard or Popover substitute.",
		"Do not attach tooltips to non-interactive decoration without a meaningful focus strategy.",
		"Do not encode lifecycle or approval in tooltip copy — use StatusBadge on the record.",
	],
});
