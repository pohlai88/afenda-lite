import { defineManifestContract } from "./manifest.contract";

export const sidebarContract = defineManifestContract({
	id: "ui.sidebar.contract",
	component: "ui.sidebar",
	purpose:
		"Provides responsive ERP workspace navigation with expandable groups, menu actions, and collapsed presentation — destinations owned by feature composition.",
	ownership: {
		componentOwns: [
			"Sidebar layout, responsive drawer behavior, expanded state, navigation composition, menu presentation, and preference callbacks.",
		],
		consumerOwns: [
			"Navigation hierarchy, destinations, active-route derivation, authorization, labels, and workspace information architecture.",
		],
	},
	semanticBoundaries: [
		"Active styling does not determine route authorization or domain selection.",
		"Collapsed presentation does not make navigation destinations unavailable.",
		"SidebarProvider must not hold business workflow state.",
	],
	approvedVariants: {
		sidebar: {
			meaning: "Standard edge-aligned sidebar shell.",
			allowedWhen: [
				"Workspace navigation occupies the normal application edge.",
			],
		},
		floating: {
			meaning: "Inset floating sidebar shell.",
			allowedWhen: [
				"The application shell intentionally uses separated navigation chrome.",
			],
		},
		inset: {
			meaning: "Sidebar paired with inset main content.",
			allowedWhen: [
				"The workspace shell requires a coordinated inset content plane.",
			],
		},
		default: {
			meaning: "Standard sidebar menu action.",
			allowedWhen: ["Navigation items use the normal workspace treatment."],
		},
		outline: {
			meaning: "Outlined sidebar menu action.",
			allowedWhen: [
				"A menu action requires a distinct bounded treatment without becoming primary.",
			],
		},
	},
	approvedSizes: {
		default: {
			meaning: "Standard sidebar menu row.",
			allowedWhen: ["Ordinary navigation labels and icons are shown."],
		},
		sm: {
			meaning: "Compact sidebar menu row.",
			allowedWhen: [
				"Dense subordinate navigation remains readable and operable.",
			],
		},
		lg: {
			meaning: "Prominent sidebar menu row.",
			allowedWhen: [
				"A workspace identity or sparse primary destination needs additional height.",
			],
		},
	},
	rules: [
		"Derive active navigation from the current route rather than local click state.",
		"Keep group labels and item order stable across expanded and collapsed modes.",
		"Hide unauthorized destinations through feature-owned navigation composition.",
		"Provide meaningful names for icon-only collapsed items.",
		"Compose product destinations in the app shell — never inside the reusable sidebar source.",
	],
	accessibility: [
		"Provide a labelled navigation landmark and meaningful names for icon-only collapsed items.",
		"Keep keyboard navigation, focus, and the toggle shortcut available.",
		"Ensure mobile sheet navigation restores focus after closing.",
	],
	prohibitedUsage: [
		"Do not place business workflow state inside SidebarProvider.",
		"Do not use active styling as authorization evidence.",
		"Do not add product navigation directly inside the reusable component source.",
		"Do not treat collapsed icons without accessible names as complete destinations.",
		"Do not use Sidebar as a substitute for in-page section navigation such as Tabs.",
	],
});
