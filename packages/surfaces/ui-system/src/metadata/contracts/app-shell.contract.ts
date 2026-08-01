import { defineManifestContract } from "./manifest.contract";

export const appShellContract = defineManifestContract({
	id: "ui.app-shell.contract",
	component: "ui.app-shell",
	purpose:
		"Provides the responsive ERP workspace frame, navigation hierarchy, header utility ports, content landmark, and persistent presentation settings without owning routes, permissions, organization membership, or domain commands.",
	ownership: {
		componentOwns: [
			"Responsive sidebar and inset layout, active navigation presentation, header utility placement, skip-target content landmark, and presentation preference wiring.",
		],
		consumerOwns: [
			"Authorized navigation data, route matching inputs, organization and actor context, command destinations, notification decisions, profile actions, and page content.",
		],
	},
	semanticBoundaries: [
		"Visible navigation does not establish authorization.",
		"A badge or active route does not define domain lifecycle state.",
		"Shell preferences change presentation only and never business behavior.",
	],
	rules: [
		"Supply stable ids and authorized destinations through the public ports.",
		"When a brand home destination is supplied, render it through the consumer's navigation link capability rather than an inert brand block.",
		"Keep one page heading in content; the shell header title provides compact route context only.",
		"Omit utilities whose product callbacks are unavailable.",
		"Preserve the main content landmark and responsive sidebar behavior.",
	],
	accessibility: [
		"Expose named navigation and main landmarks with a stable focus target.",
		"Keep navigation branches, utility triggers, and sidebar controls keyboard operable.",
		"Preserve readable labels in collapsed and mobile layouts.",
	],
	prohibitedUsage: [
		"Do not pass unauthorized routes or fake actions for visual completeness.",
		"Do not import Studio staging code or app-local primitives into the shell.",
		"Do not make shell presentation settings alter permission or domain policy.",
	],
});
