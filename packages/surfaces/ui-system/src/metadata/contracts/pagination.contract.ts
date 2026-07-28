import { defineManifestContract } from "./manifest.contract";

export const paginationContract = defineManifestContract({
	id: "ui.pagination.contract",
	component: "ui.pagination",
	purpose:
		"Presents navigation among ordered collection pages with current-position context.",
	ownership: {
		componentOwns: [
			"Pagination navigation structure, current-page presentation, previous-next controls, and ellipsis composition.",
		],
		consumerOwns: [
			"Page count, cursor or index policy, URLs, query state, authorization, and data fetching.",
		],
	},
	semanticBoundaries: [
		"Displayed page numbers do not determine server pagination strategy.",
		"A disabled direction does not prove that no additional authorized records exist.",
	],
	rules: [
		"Use semantic links when pages have stable destinations.",
		"Expose the current page and preserve active filters across navigation.",
		"Use ellipsis only to abbreviate a known range, not to imply unknown data.",
	],
	accessibility: [
		"Provide a pagination navigation landmark.",
		"Mark the current page and name previous and next destinations clearly.",
		"Keep every available page target keyboard focusable with visible focus.",
	],
	prohibitedUsage: [
		"Do not use Pagination to own fetching or URL policy.",
		"Do not render clickable disabled links.",
		"Do not reset unrelated collection state during page navigation.",
	],
});
