import { defineManifestContract } from "./manifest.contract";

export const sidebarCookieContract = defineManifestContract({
	id: "ui.sidebar-cookie.contract",
	component: "ui.sidebar-cookie",
	purpose:
		"Defines the stable cookie name and maximum age used only for sidebar presentation preference.",
	ownership: {
		componentOwns: [
			"Stable sidebar-preference cookie identifiers shared by server and client composition.",
		],
		consumerOwns: [
			"Cookie reading, writing, security attributes, request handling, and application privacy policy.",
		],
	},
	semanticBoundaries: [
		"Sidebar preference is not authentication, authorization, consent, or business state.",
		"Cookie duration does not determine user-session lifetime.",
	],
	rules: [
		"Use these constants only for sidebar expanded or collapsed preference.",
		"Keep server and client consumers on the same exported values.",
		"Treat absence or invalid values as presentation defaults.",
	],
	accessibility: [
		"Ensure persisted presentation never overrides the user's ability to reopen navigation.",
		"Keep navigation operable when the preference is unavailable.",
		"Do not persist a state that removes keyboard access to sidebar controls.",
	],
	prohibitedUsage: [
		"Do not store identity, permissions, or sensitive data under this cookie.",
		"Do not reuse the constants for unrelated preferences.",
		"Do not expose this metadata as a new package subpath.",
	],
});
