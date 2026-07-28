import { defineManifestContract } from "./manifest.contract";

export const columnVisibilityMenuContract = defineManifestContract({
	id: "ui.column-visibility-menu.contract",
	component: "ui.column-visibility-menu",
	purpose: "Provides controlled visibility choices for optional table columns.",
	ownership: {
		componentOwns: [
			"Column-option menu presentation, checked-state interaction, and controlled visibility callbacks.",
		],
		consumerOwns: [
			"Column catalogue, required columns, authorization, persistence, table state, and user preference policy.",
		],
	},
	semanticBoundaries: [
		"Hidden presentation does not remove data access or authorization requirements.",
		"A visible option does not imply that the underlying data is available to the user.",
	],
	rules: [
		"Use stable column identifiers independent of translated labels.",
		"Keep required identity or action columns non-hideable through feature policy.",
		"Persist visibility only when the owning view defines preference behavior.",
	],
	accessibility: [
		"Give the trigger a clear accessible name and expanded state.",
		"Expose each option's checked and disabled state.",
		"Preserve keyboard menu navigation and focus restoration.",
	],
	prohibitedUsage: [
		"Do not use column hiding as data authorization.",
		"Do not allow every identifying column to be hidden.",
		"Do not persist visibility inside the reusable menu.",
	],
});
