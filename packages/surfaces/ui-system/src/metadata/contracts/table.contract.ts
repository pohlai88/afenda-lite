import { defineManifestContract } from "./manifest.contract";

export const tableContract = defineManifestContract({
	id: "ui.table.contract",
	component: "ui.table",
	purpose:
		"Provides semantic table structure and consistent styling for static or manually composed ERP tabular relationships — invoice registers, allocation lines, remittance summaries — without owning collection interaction state.",
	ownership: {
		componentOwns: [
			"Native table element composition, caption and header presentation, row styling, selected-row chrome, and responsive overflow framing.",
		],
		consumerOwns: [
			"Column meaning, header associations, row identity, formatting, sorting behavior, and domain data.",
		],
	},
	semanticBoundaries: [
		"Table styling does not provide DataTable interaction or collection state management.",
		"Row position does not establish stable record identity.",
		"Table does not replace DataTable for governed sorting, filtering, selection, or pagination.",
	],
	rules: [
		"This contract governs Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, and TableCaption as one family.",
		"Use Table only when content has meaningful row-and-column relationships.",
		"Provide clear column headers and a caption when surrounding context is insufficient.",
		"Use DataTable when governed sorting, filtering, selection, or pagination is required.",
		"Prefer Card composition for invoice registers and allocation workbenches.",
	],
	accessibility: [
		"Preserve native table, caption, header, row, and cell semantics.",
		"Associate headers with their data cells through correct structure.",
		"Keep links and controls within cells keyboard operable with visible focus.",
		"Do not omit headers solely for visual minimalism.",
	],
	prohibitedUsage: [
		"Do not use Table for arbitrary grid layout.",
		"Do not create interactive row behavior without explicit child controls.",
		"Do not omit headers solely for visual minimalism.",
		"Do not treat Table as a substitute for DataTable interaction contracts.",
	],
});
