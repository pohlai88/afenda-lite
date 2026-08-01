import { defineManifestContract } from "./manifest.contract";

export const dataTableContract = defineManifestContract({
	id: "ui.data-table.contract",
	component: "ui.data-table",
	purpose:
		"Provides controlled ERP tabular presentation for sorting, filtering, pagination, selection, row actions, bulkActions, density, and asynchronous collection states — without owning fetch, authorization, or domain eligibility.",
	ownership: {
		componentOwns: [
			"Controlled tabular presentation, interaction mechanics, density (comfortable | compact), geometry-preserving loading, empty/error presentation, selection chrome, and bulkActions composition slot.",
		],
		consumerOwns: [
			"Data fetching, stable row identity, authorization, eligibility, URL state, persistence, column render policy, and domain vocabulary including StatusBadge mapping.",
		],
	},
	semanticBoundaries: [
		"Selection presentation does not prove authorization or domain eligibility.",
		"Sorting, filtering, and pagination state does not define server query policy.",
		"An empty presentation does not determine whether the collection is truly empty, filtered, restricted, or unavailable.",
		"bulkActions are composed entry points — they do not grant permission or imply atomic success.",
		"StatusBadge in cells owns lifecycle presentation; Badge owns taxonomy — DataTable does not invent status semantics.",
	],
	approvedVariants: {
		comfortable: {
			meaning:
				"Default density for readable operational and mixed-content tables.",
			allowedWhen: [
				"Rows contain mixed content, metadata, status, or actions.",
				"Scanning clarity and interaction comfort matter more than maximum row density.",
			],
		},
		compact: {
			meaning:
				"Dense layout for high-volume comparison and operational scanning.",
			allowedWhen: [
				"Operators need to compare many rows.",
				"Cell content remains concise and interactive targets remain usable.",
			],
			prohibitedWhen: [
				"Rows contain long descriptions, multiline content, or complex interactive controls.",
				"Reduced spacing makes selection, navigation, or row actions difficult to operate.",
			],
		},
	},
	rules: [
		"Feature code owns data fetching, authorization, URL state, persistence, and domain policy.",
		"DataTable may coordinate controlled table mechanics but must not determine business meaning.",
		"Columns must use stable keys and provide a non-empty visible title supported by the current column API.",
		"For each enabled sorting, filtering, pagination, visibility, ordering, pinning, or selection behavior, supply controlled state and its corresponding callback from the consuming feature.",
		"Pagination controls may present navigation mechanics, but page-size limits, cursor policy, and server query rules belong to the feature or domain integration layer.",
		"Bulk actions require visible selected-count feedback and must operate only on explicitly selected eligible rows.",
		"Treat selection as controlled interaction state, not as proof of authorization or domain eligibility.",
		"Row actions must remain discoverable without making the entire row ambiguous.",
		"Use one consistent row identity key that remains stable across sorting, filtering, pagination, and refreshes.",
		"Preserve user-visible state when asynchronous refreshes return equivalent data.",
		"Loading presentation must preserve the visible table headers and representative row geometry so the collection does not collapse or shift while data resolves.",
		"Filtered-empty state must be distinguishable from a genuinely empty collection.",
		"Empty-state, error, and toolbar actions must connect to real feature behavior; omit actions when the required route, command, or permission is unavailable.",
		"Keep numeric amounts in domain-safe units until the presentation column formats currency.",
	],
	accessibility: [
		"Use semantic table structure when the content represents tabular relationships.",
		"Column headers must identify the data represented by their cells.",
		"Sortable headers must expose whether they are sortable and communicate the current sort direction.",
		"Selection controls must expose the selected state and identify the associated row.",
		"Select-all controls must communicate checked, unchecked, and partially selected states.",
		"Keyboard focus must remain visible for headers, links, selection controls, and row actions.",
		"Loading, empty, filtered-empty, error, and ready states must be communicated without relying on color alone.",
		"Loading tables must remain identifiable as tables, expose aria-busy, and announce a concise status without announcing each decorative skeleton.",
		"Row actions must have accessible names that identify both the action and, where necessary, the affected record.",
		"Do not rely on hover alone to reveal actions required for keyboard or touch users.",
	],
	prohibitedUsage: [
		"Do not make DataTable own server data fetching.",
		"Do not encode domain permissions, eligibility rules, or approval policy inside the component.",
		"Do not derive authoritative domain state from presentation state.",
		"Do not use row position or page index as record identity when rows can be sorted, filtered, paginated, inserted, or refreshed.",
		"Do not use compact density when it reduces interactive targets below a usable size.",
		"Do not make the entire row clickable when the row contains multiple independent actions or destinations.",
		"Do not hide unauthorized actions as a substitute for server-side authorization.",
		"Do not render fake, decorative, or permanently disabled table actions to imply unavailable product capability.",
		"Do not silently omit columns or values when the user needs an explanation for unavailable or restricted data.",
		"Do not use a table when the content has no meaningful row-and-column relationship.",
		"Do not allow selection state to persist against records that are no longer present or eligible.",
		"Do not store pre-formatted currency strings as sortable source data.",
	],
});
