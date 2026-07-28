import { defineManifestContract } from "./manifest.contract";

export const tableContract = defineManifestContract({
	id: "ui.table.contract",
	component: "ui.table",
	purpose:
		"Provides semantic table structure and consistent styling for static or manually composed tabular relationships.",
	ownership: {
		componentOwns: [
			"Native table element composition, caption and header presentation, row styling, and responsive overflow framing.",
		],
		consumerOwns: [
			"Column meaning, header associations, row identity, formatting, sorting behavior, and domain data.",
		],
	},
	semanticBoundaries: [
		"Table styling does not provide DataTable interaction or collection state management.",
		"Row position does not establish stable record identity.",
	],
	rules: [
		"Use Table only when content has meaningful row-and-column relationships.",
		"Provide clear column headers and a caption when surrounding context is insufficient.",
		"Use DataTable when governed sorting, filtering, selection, or pagination is required.",
	],
	accessibility: [
		"Preserve native table, caption, header, row, and cell semantics.",
		"Associate headers with their data cells through correct structure.",
		"Keep links and controls within cells keyboard operable with visible focus.",
	],
	prohibitedUsage: [
		"Do not use Table for arbitrary grid layout.",
		"Do not create interactive row behavior without explicit child controls.",
		"Do not omit headers solely for visual minimalism.",
	],
});
