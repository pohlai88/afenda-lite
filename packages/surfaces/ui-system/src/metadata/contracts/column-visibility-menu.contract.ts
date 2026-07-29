import { defineManifestContract } from "./manifest.contract";

export const columnVisibilityMenuContract = defineManifestContract({
	id: "ui.column-visibility-menu.contract",
	component: "ui.column-visibility-menu",
	purpose:
		"Lets operators choose which optional table columns stay visible on an ERP list or workbench without leaving the current view or changing underlying data access.",
	ownership: {
		componentOwns: [
			"Column-option menu presentation, checked-state interaction, trigger labelling defaults, and controlled visibility callbacks.",
		],
		consumerOwns: [
			"Column catalogue, stable identifiers, required or non-hideable columns, authorization, table rendering state, and preference persistence policy.",
		],
	},
	semanticBoundaries: [
		"Hidden presentation does not remove data access, row identity, or authorization requirements.",
		"A checked visibility option does not imply the operator is authorized to read the underlying field values.",
		"ColumnVisibilityMenu does not own table sorting, filtering, saved views, or preference storage.",
	],
	rules: [
		"Use stable column identifiers independent of translated labels.",
		"Keep required identity or action columns non-hideable through feature policy (disabled options).",
		"Persist visibility only when the owning view defines preference behavior — not inside the reusable menu.",
		"Place the menu beside the table or toolbar it controls so operators understand the affected surface.",
		"Prefer ColumnVisibilityMenu for optional display density; use SavedViewSelect when operators switch named view presets.",
	],
	accessibility: [
		"Give the trigger a clear accessible name and expanded state.",
		"Expose each option's checked and disabled state through menu checkbox items.",
		"Preserve keyboard menu navigation and focus restoration when the menu closes.",
		"Keep option labels concise and identical to the column headers they control when practical.",
	],
	prohibitedUsage: [
		"Do not use column hiding as data authorization or tenancy isolation.",
		"Do not allow every identifying column to be hidden.",
		"Do not persist visibility preferences inside the reusable menu component.",
		"Do not treat visibility toggles as domain lifecycle, approval state, or row selection.",
	],
});
