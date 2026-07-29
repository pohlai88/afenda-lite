import { defineManifestContract } from "./manifest.contract";

export const asyncStateContract = defineManifestContract({
	id: "ui.async-state.contract",
	component: "ui.async-state",
	purpose:
		"Renders exactly one truthful outcome for an owned asynchronous ERP content region — loading, empty, filtered-empty, error, or ready — so operators see consistent region feedback without inventing parallel empty or error layouts.",
	ownership: {
		componentOwns: [
			"Mutually exclusive state presentation, loading spinner composition, empty and filtered-empty Empty composition, error Alert composition, ready children passthrough, and consistent region hierarchy.",
		],
		consumerOwns: [
			"State derivation from fetch and query results, filters, authorization, create/clear/retry commands, stale-data policy, surrounding Card or dashboard identity, and whether ready children remain current.",
		],
	},
	semanticBoundaries: [
		"Presentation state does not derive authoritative request, cache, or domain state.",
		"Ready presentation does not prove that data is current, complete, authorized, or free of stale reads.",
		"Empty does not mean filtered-empty — absence of records is not the same as filters excluding all matches.",
		"AsyncState owns the content region outcome only — surrounding titles, filters, and navigation stay visible.",
		"AsyncState does not replace Alert for page-level notices, Toast for transient acknowledgement, or StatusBadge for record lifecycle.",
	],
	approvedVariants: {
		loading: {
			meaning: "Content is in flight; the region is not yet empty or ready.",
			allowedWhen: [
				"The feature has an outstanding request and no trustworthy ready payload to show yet.",
			],
			prohibitedWhen: [
				"A terminal error already exists and retry has not been started.",
				"Ready data is available and should be shown immediately.",
				"Loading is stacked above stale empty or error content for the same region.",
			],
		},
		empty: {
			meaning:
				"The query succeeded and there are no records in the unfiltered domain set.",
			allowedWhen: [
				"The operator has no invoices, suppliers, or other entities yet and may create the first one.",
			],
			prohibitedWhen: [
				"Active filters exclude all matches — use filtered-empty.",
				"The request failed — use error.",
			],
		},
		"filtered-empty": {
			meaning: "The query succeeded but current filters exclude every match.",
			allowedWhen: [
				"Clearing or adjusting filters can restore results without creating a new record.",
			],
			prohibitedWhen: [
				"The domain set is truly empty with no filters applied — use empty.",
				"Copy implies records were deleted or never existed when filters alone excluded matches.",
			],
		},
		error: {
			meaning:
				"The query or load failed and the operator may retry or escalate.",
			allowedWhen: [
				"The feature owns a real retry or recovery command for the failed request.",
			],
			prohibitedWhen: [
				"The failure is a field validation error inside a form — use FormField or FormError.",
				"The failure requires irreversible confirmation — use AlertDialog after the operator chooses a harmful recovery.",
			],
		},
		ready: {
			meaning: "Trustworthy content is available to render in the region.",
			allowedWhen: [
				"Feature-owned async logic has a payload the operator may review or act on.",
			],
			prohibitedWhen: [
				"A terminal error remains unresolved and ready content would misrepresent success.",
			],
		},
	},
	rules: [
		"Supply exactly one truthful state from feature-owned async logic for a given region.",
		"Distinguish true empty from filtered-empty and from authorization-limited results.",
		"Connect Create, Clear filters, and Retry actions to real feature commands — never decorative controls.",
		"Style Retry as a recovery command (default Button), not destructive — destructive is for irreversible harm.",
		"Keep loading labels specific to the region, for example Loading invoices.",
		"Compose AsyncState inside the owning Card, table, dashboard widget, or page region — retain surrounding context while the body changes state.",
		"Do not replace unrelated page navigation, filters, headings, or actions for one failed regional request.",
	],
	accessibility: [
		"Expose loading changes politely without duplicate competing live regions.",
		"Keep Create, Clear filters, and Retry actions keyboard operable and clearly named.",
		"Do not rely on animation, illustration, or color alone for state meaning.",
		"Preserve readable titles and descriptions for empty, filtered-empty, and error outcomes.",
	],
	prohibitedUsage: [
		"Do not fetch data, infer permissions, or own retry policy inside AsyncState.",
		"Do not show ready content after a terminal error without an explicit stale-data explanation owned by the feature.",
		"Do not render fake retry, create, or clear-filter actions.",
		"Do not use empty copy for filtered results or filtered-empty copy for a true empty domain.",
		"Do not nest multiple competing AsyncState regions that announce the same fetch twice.",
		"Do not style Retry as a destructive command when it only recovers a failed load.",
		"Do not stack contradictory states (loading above stale empty/error) for the same region.",
	],
});
