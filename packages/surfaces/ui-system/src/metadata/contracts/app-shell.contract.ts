import { defineManifestContract } from "./manifest.contract";

export const appShellContract = defineManifestContract({
	id: "ui.app-shell.contract",
	component: "ui.app-shell",
	purpose:
		"Provides the responsive ERP workspace frame, navigation hierarchy, header utility ports, content landmark, and persistent presentation settings without owning routes, permissions, organization membership, or domain commands.",
	ownership: {
		componentOwns: [
			"Responsive sidebar and inset layout, active navigation presentation, semantic header utility prioritization and overflow, skip-target content landmark, and presentation preference wiring.",
		],
		consumerOwns: [
			"Authorized navigation data, route matching inputs, organization and actor context, command destinations, notification decisions, profile actions, and page content.",
		],
	},
	semanticBoundaries: [
		"Visible navigation does not establish authorization.",
		"A badge or active route does not define domain lifecycle state.",
		"Shell preferences change presentation only and never business behavior.",
		"Utility priority changes narrow-screen placement only; it never grants access, changes command meaning, or removes a supplied utility.",
	],
	rules: [
		"Supply stable ids and authorized destinations through the public ports.",
		"When a brand home destination is supplied, render it through the consumer's navigation link capability rather than an inert brand block.",
		"Keep one page heading in content; the shell header title provides compact route context only.",
		"Omit utilities whose product callbacks are unavailable.",
		"Declare utility priority by stable utility id; at narrow widths AppShell keeps one available primary utility direct and moves every remaining supplied utility into the labelled overflow menu.",
		"When no available utility is marked primary, AppShell uses the first available id from its canonical utility registry rather than JSX child order.",
		"Preserve the main content landmark and responsive sidebar behavior.",
	],
	accessibility: [
		"Expose named navigation and main landmarks with a stable focus target.",
		"Keep navigation branches, utility triggers, and sidebar controls keyboard operable.",
		"Preserve readable labels in collapsed and mobile layouts.",
		"The narrow-screen utility overflow must expose a descriptive trigger name, keyboard-operable menu items, focus restoration after overlays close, and wrapping labels at high zoom or with longer translations.",
	],
	prohibitedUsage: [
		"Do not pass unauthorized routes or fake actions for visual completeness.",
		"Do not import Studio staging code or app-local primitives into the shell.",
		"Do not make shell presentation settings alter permission or domain policy.",
		"Do not hide shell utilities in product consumers with breakpoint classes or infer priority from JSX order.",
	],
});
