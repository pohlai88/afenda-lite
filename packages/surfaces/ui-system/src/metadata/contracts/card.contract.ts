import { defineManifestContract } from "./manifest.contract";

export const cardContract = defineManifestContract({
	id: "ui.card.contract",
	component: "ui.card",
	purpose:
		"Provides a bounded content group with one clear local subject, object, or tool.",
	ownership: {
		componentOwns: [
			"Bounded visual composition, card-region structure, and consistent local hierarchy.",
		],
		consumerOwns: [
			"The represented subject, semantic heading level, actions, permissions, and domain state.",
		],
	},
	semanticBoundaries: [
		"A visual boundary does not make arbitrary content an independently meaningful object.",
		"Card styling does not provide dialog, sheet, alert, or other overlay semantics.",
		"A card container does not imply one destination or authorize card-wide interaction.",
	],
	rules: [
		"Use Card for repeated records, summaries, framed tools, or independently meaningful content groups.",
		"Give each card one clear subject and keep its composition shallow.",
		"Use CardTitle for title styling when the card introduces a named subject or section, and supply the appropriate semantic heading element because CardTitle does not choose a heading level.",
		"Place actions in CardAction or CardFooter according to whether they are contextual or workflow-closing.",
		"Keep visual treatment consistent across cards serving the same collection or purpose.",
		"Keep the Card root non-interactive and use a semantic Button or Link child for every action or destination.",
		"Feature code owns the card subject, actions, permissions, and domain state; Card owns bounded visual composition only.",
	],
	accessibility: [
		"Use a heading element at the appropriate level when the card introduces a section, record, or item.",
		"Preserve logical reading order between title, description, content, metadata, and actions.",
		"Do not rely on border, shadow, background, or color alone to communicate selection, error, warning, or lifecycle state.",
		"Interactive children must expose clear accessible names and retain visible keyboard focus.",
		"Keep interactive children separate so their focus order and individual purposes remain clear.",
	],
	prohibitedUsage: [
		"Do not nest cards inside cards unless the inner card represents a genuinely independent object.",
		"Do not use Card as the default wrapper for every page section.",
		"Do not use Card as a substitute for DialogContent, AlertDialogContent, SheetContent, or another overlay surface.",
		"Do not treat CardTitle's visual styling as sufficient heading semantics.",
		"Do not add onClick, button semantics, keyboard tab stops, or a card-wide link to the Card root.",
		"Do not use empty cards purely to create spacing, borders, or background decoration.",
		"Do not place unrelated subjects inside the same card.",
	],
});
