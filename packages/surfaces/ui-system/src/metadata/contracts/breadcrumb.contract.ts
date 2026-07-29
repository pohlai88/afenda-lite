import { defineManifestContract } from "./manifest.contract";

export const breadcrumbContract = defineManifestContract({
	id: "ui.breadcrumb.contract",
	component: "ui.breadcrumb",
	purpose:
		"Presents the current page's hierarchical workspace location in ERP shells — module, list, and record context — without encoding workflow progress or browser history.",
	ownership: {
		componentOwns: [
			"Breadcrumb navigation landmark, list structure, separators, current-page presentation (BreadcrumbPage), link styling (BreadcrumbLink), and overflow affordance (BreadcrumbEllipsis).",
		],
		consumerOwns: [
			"Hierarchy depth, labels, destinations, route authorization, truncation policy, and which ancestors are safe to expose.",
		],
	},
	semanticBoundaries: [
		"Breadcrumb order does not establish domain ownership or authorization.",
		"Visual truncation does not remove intermediate navigation meaning — feature code still owns the full authorized path.",
		"Breadcrumb is not a stepper: trail position does not mean step completion or wizard progress.",
		"Breadcrumb is not browser history: crumbs are stable hierarchy, not a back-stack of clicks.",
	],
	rules: [
		"This contract governs Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, and BreadcrumbEllipsis as one navigation family.",
		"Use Breadcrumb for stable hierarchical location rather than interaction history.",
		"Render ancestors as real links (or asChild onto framework Link) and the current page as BreadcrumbPage.",
		"Keep labels concise and consistent with destination headings.",
		"Use BreadcrumbEllipsis when depth exceeds the layout budget; keep the root and current page recognizable.",
		"Omit ancestors the operator is not authorized to open — do not invent crumbs to fill a visual path.",
	],
	accessibility: [
		"Provide a navigation landmark labelled as breadcrumbs (default aria-label on Breadcrumb).",
		"Mark the current page programmatically via BreadcrumbPage (aria-current).",
		"Hide decorative separators and ellipsis chrome from assistive technologies.",
		"Ensure linked ancestors expose clear accessible names matching their destinations.",
	],
	prohibitedUsage: [
		"Do not use Breadcrumb as a stepper or browser-history display.",
		"Do not link the current page to itself.",
		"Do not expose unauthorized ancestors merely to complete a visual hierarchy.",
		"Do not encode approval, posting, or lifecycle state in breadcrumb labels — use StatusBadge.",
		"Do not use BreadcrumbLink as a command or mutation control.",
	],
});
