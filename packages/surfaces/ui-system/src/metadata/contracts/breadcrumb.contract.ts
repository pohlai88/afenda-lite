import { defineManifestContract } from "./manifest.contract";

export const breadcrumbContract = defineManifestContract({
	id: "ui.breadcrumb.contract",
	component: "ui.breadcrumb",
	purpose: "Presents the current page's hierarchical navigation path.",
	ownership: {
		componentOwns: [
			"Breadcrumb navigation structure, separators, current-page presentation, and overflow affordance.",
		],
		consumerOwns: [
			"Hierarchy, labels, destinations, route authorization, and truncation policy.",
		],
	},
	semanticBoundaries: [
		"Breadcrumb order does not establish domain ownership or authorization.",
		"Visual truncation does not remove intermediate navigation meaning.",
	],
	rules: [
		"Use Breadcrumb for stable hierarchical location rather than interaction history.",
		"Render ancestors as real links and the current page as non-link text.",
		"Keep labels concise and consistent with destination headings.",
	],
	accessibility: [
		"Provide a navigation landmark labelled as breadcrumbs.",
		"Mark the current page programmatically.",
		"Hide decorative separators from assistive technologies.",
	],
	prohibitedUsage: [
		"Do not use Breadcrumb as a stepper or browser-history display.",
		"Do not link the current page to itself.",
		"Do not expose unauthorized ancestors merely to complete a visual hierarchy.",
	],
});
