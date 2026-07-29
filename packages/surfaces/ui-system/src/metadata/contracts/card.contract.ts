import { defineManifestContract } from "./manifest.contract";

export const cardContract = defineManifestContract({
	id: "ui.card.contract",
	component: "ui.card",
	purpose:
		"Bounds one independently meaningful ERP subject — aggregate summary, named record, posting exception, or decision context — within Mineral Calm surface hierarchy (canvas → workspace → card) so operators can scan hierarchical work without treating the surface as lifecycle, navigation, or overlay.",
	ownership: {
		componentOwns: [
			"Bounded visual composition, CardHeader / CardContent / CardFooter / CardAction structure, local hierarchy, and consistent framing across a collection.",
		],
		consumerOwns: [
			"The represented subject, semantic heading level, StatusBadge or Badge placement, actions, permissions, destinations, and domain state.",
		],
	},
	semanticBoundaries: [
		"A visual Card boundary does not make arbitrary content an independently meaningful business object.",
		"Card styling does not provide Dialog, Sheet, Alert, AlertDialog, or other overlay semantics.",
		"A Card container does not imply one destination or authorize card-wide interaction.",
		"Card does not own lifecycle meaning — StatusBadge presents authoritative state; Badge remains taxonomy only.",
	],
	rules: [
		"This contract governs Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, and CardFooter as one composition family.",
		"Use Card for repeated records, operational summaries, framed tools, exceptions, or independently meaningful content groups.",
		"Give each Card one clear subject and keep its composition shallow — summaries, records, and exceptions use distinct layouts.",
		"Use CardTitle for title styling when the Card introduces a named subject; supply heading semantics via landmark headings or aria-labelledby because CardTitle is a styled div.",
		"Place compact contextual controls in CardAction; place workflow-closing or decision actions in CardFooter.",
		"Keep visual treatment consistent across Cards serving the same collection or purpose.",
		"Keep the Card root non-interactive and use a semantic Button or Link child for every action or destination.",
		"Feature code owns the subject, actions, permissions, and domain state; Card owns bounded visual composition only.",
	],
	accessibility: [
		"Name the Card region with aria-labelledby when its boundary needs independent navigation; pair the label with CardTitle id when CardTitle is a styled div.",
		"Preserve logical reading order between title, description, content, metadata, and actions.",
		"Do not nest heading elements inside CardTitle — section landmarks own h1 / h2.",
		"Do not rely on border, shadow, background, or color alone to communicate selection, error, warning, or lifecycle state.",
		"Interactive children must expose clear accessible names and retain visible keyboard focus.",
		"Keep interactive children separate so their focus order and individual purposes remain clear.",
	],
	prohibitedUsage: [
		"Do not nest Cards inside Cards unless the inner Card represents a genuinely independent object.",
		"Do not use Card as the default wrapper for every page section or as spacing decoration.",
		"Do not use Card as a substitute for DialogContent, AlertDialogContent, SheetContent, or another overlay surface.",
		"Do not treat CardTitle visual styling as sufficient heading semantics without landmark or aria naming.",
		"Do not add onClick, button semantics, keyboard tab stops, or a card-wide link to the Card root.",
		"Do not place unrelated subjects inside the same Card.",
		"Do not use Badge as the authoritative lifecycle signal on a Card — use StatusBadge.",
	],
});
