import { defineManifestContract } from "./manifest.contract";

export const sheetContract = defineManifestContract({
	id: "ui.sheet.contract",
	component: "ui.sheet",
	purpose:
		"Provides a modal edge surface for contextual workflows that benefit from retained page context.",
	ownership: {
		componentOwns: [
			"Sheet overlay, edge placement, modal focus containment, labelled content, and dismissal mechanics.",
		],
		consumerOwns: [
			"Workflow suitability, content, validation, authorization, submission, dirty-state policy, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Edge placement does not make a workflow secondary, safe, or authorized.",
		"Closing the sheet does not determine whether changes are discarded or persisted.",
	],
	rules: [
		"Use Sheet for contextual work that benefits from seeing the underlying page relationship.",
		"Provide one clear title and predictable close path.",
		"Use Dialog for compact decisions and a page for complex or long-running work.",
	],
	accessibility: [
		"Provide an accessible title and description where needed.",
		"Contain focus while open and restore it meaningfully on close.",
		"Keep all controls keyboard operable with visible focus.",
	],
	prohibitedUsage: [
		"Do not use Sheet mechanically for every edit workflow.",
		"Do not dismiss dirty content without feature-owned protection.",
		"Do not place authorization or submission policy inside the reusable surface.",
	],
});
