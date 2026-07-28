import { defineManifestContract } from "./manifest.contract";

export const collapsibleContract = defineManifestContract({
	id: "ui.collapsible.contract",
	component: "ui.collapsible",
	purpose:
		"Provides disclosure of one optional content region from one controlling trigger.",
	ownership: {
		componentOwns: [
			"Disclosure state, trigger-content relationship, expanded semantics, and controlled callbacks.",
		],
		consumerOwns: [
			"Trigger label, content, persistence, permissions, and whether disclosure is suitable.",
		],
	},
	semanticBoundaries: [
		"Collapsed presentation does not make content unauthorized or unloaded.",
		"Disclosure state does not represent selection, completion, or approval.",
	],
	rules: [
		"Use Collapsible for one subordinate region whose content may be temporarily hidden.",
		"Keep the trigger adjacent to and descriptive of the controlled region.",
		"Preserve controlled state when the surrounding workflow requires it.",
	],
	accessibility: [
		"Use an interactive trigger with expanded and controls relationships.",
		"Keep the trigger keyboard operable with visible focus.",
		"Maintain sensible reading order when content becomes visible.",
	],
	prohibitedUsage: [
		"Do not hide mandatory errors, actions, or legal information by default.",
		"Do not use Collapsible as a modal or navigation substitute.",
		"Do not infer data loading or authorization from open state.",
	],
});
