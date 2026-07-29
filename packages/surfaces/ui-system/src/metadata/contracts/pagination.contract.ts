import { defineManifestContract } from "./manifest.contract";

export const paginationContract = defineManifestContract({
	id: "ui.pagination.contract",
	component: "ui.pagination",
	purpose:
		"Presents navigation among ordered ERP collection pages with current-position context — page chrome, not fetch or cursor policy.",
	ownership: {
		componentOwns: [
			"Pagination navigation structure, current-page presentation, previous and next controls, and ellipsis composition.",
		],
		consumerOwns: [
			"Page count, cursor or index policy, URLs, query state, authorization, and data fetching.",
		],
	},
	semanticBoundaries: [
		"Displayed page numbers do not determine server pagination strategy.",
		"A disabled direction does not prove that no additional authorized records exist.",
		"Ellipsis abbreviates a known range — it does not imply unknown or infinite data.",
	],
	rules: [
		"Use semantic links when pages have stable destinations.",
		"Expose the current page and preserve active filters across navigation.",
		"Use ellipsis only to abbreviate a known range, not to imply unknown data.",
		"Place Pagination with the collection it controls — typically below a table or list, never inside PageHeader.",
		"Keep previous and next destinations clearly named for keyboard and screen-reader users.",
	],
	accessibility: [
		"Provide a pagination navigation landmark.",
		"Mark the current page and name previous and next destinations clearly.",
		"Keep every available page target keyboard focusable with visible focus.",
		"Do not render disabled destinations as clickable links.",
	],
	prohibitedUsage: [
		"Do not use Pagination to own fetching or URL policy.",
		"Do not render clickable disabled links.",
		"Do not reset unrelated collection state during page navigation.",
		"Do not place Pagination inside PageHeader or EntityHeader.",
		"Do not use Pagination as a substitute for Stepper wizard progress.",
	],
});
