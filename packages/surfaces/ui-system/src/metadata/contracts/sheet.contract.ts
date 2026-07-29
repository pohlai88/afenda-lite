import { defineManifestContract } from "./manifest.contract";

export const sheetContract = defineManifestContract({
	id: "ui.sheet.contract",
	component: "ui.sheet",
	purpose:
		"Provides a modal edge surface for ERP record inspectors and admin side panels that benefit from retained list or page context.",
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
		"Sheet does not replace Dialog for compact decisions or a full page for long-running work.",
	],
	rules: [
		"Use Sheet for contextual work that benefits from seeing the underlying page relationship.",
		"Prefer the right edge for ERP and admin record inspectors.",
		"Provide one clear title and predictable close path.",
		"Expose named footer commands for approve, save, or dismiss.",
		"Use Dialog for compact decisions and a page for complex or long-running work.",
	],
	accessibility: [
		"Provide an accessible title and description where needed.",
		"Contain focus while open and restore it meaningfully on close.",
		"Keep all controls keyboard operable with visible focus.",
		"Support Escape dismissal unless feature policy must protect dirty state.",
	],
	prohibitedUsage: [
		"Do not use Sheet mechanically for every edit workflow.",
		"Do not dismiss dirty content without feature-owned protection.",
		"Do not place authorization or submission policy inside the reusable surface.",
		"Do not bury the primary action without an accessible name.",
		"Do not use Sheet for irreversible confirmation — use AlertDialog.",
	],
});
