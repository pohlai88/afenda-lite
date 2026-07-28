import { defineManifestContract } from "./manifest.contract";

export const accordionContract = defineManifestContract({
	id: "ui.accordion.contract",
	component: "ui.accordion",
	purpose:
		"Provides disclosure of related content sections through labelled accordion items.",
	ownership: {
		componentOwns: [
			"Accordion disclosure interaction, expanded-state semantics, trigger-content relationships, and keyboard focus.",
		],
		consumerOwns: [
			"Section labels, content, controlled state, persistence, and domain visibility policy.",
		],
	},
	semanticBoundaries: [
		"Collapsed content does not become unauthorized or absent.",
		"Expanded presentation does not imply workflow completion or selection.",
	],
	rules: [
		"Use Accordion for related optional-detail sections.",
		"Keep trigger labels concise and descriptive of their content.",
		"Choose single or multiple expansion from the information task.",
	],
	accessibility: [
		"Preserve button, expanded, and controlled-region relationships.",
		"Keep keyboard focus visible on every trigger.",
		"Maintain logical heading hierarchy around accordion triggers.",
	],
	prohibitedUsage: [
		"Do not use Accordion to hide required form errors or primary actions.",
		"Do not use disclosure state as domain state.",
		"Do not nest accordions when a simpler hierarchy is available.",
	],
});
