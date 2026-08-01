import { defineManifestContract } from "./manifest.contract";

export const profileDropdownContract = defineManifestContract({
	id: "ui.profile-dropdown.contract",
	component: "ui.profile-dropdown",
	purpose:
		"Provides compact signed-in actor identity and an optional governed menu of implemented profile actions without owning authentication, account data, routing, or sign-out behavior.",
	ownership: {
		componentOwns: [
			"Actor fallback presentation, trigger naming, menu disclosure, action item composition, keyboard navigation, dismissal, and focus restoration.",
		],
		consumerOwns: [
			"Verified actor name and initials, authorized action catalogue, routing, mutations, sign-out, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Displayed identity does not establish authentication or authorization.",
		"A menu item does not imply a route or mutation exists.",
		"Profile actions do not define domain lifecycle.",
	],
	rules: [
		"Show identity without an interactive trigger when no action implementation exists.",
		"Use stable action identifiers and the governed DropdownMenu structure.",
		"Always provide an AvatarFallback.",
	],
	accessibility: [
		"Name the trigger with the signed-in actor context.",
		"Preserve menu keyboard navigation, Escape dismissal, and trigger focus restoration.",
		"Keep action labels visible and understandable without icons.",
	],
	prohibitedUsage: [
		"Do not expose inert profile actions.",
		"Do not use identity presentation as an authentication check.",
		"Do not hand-roll menu semantics.",
	],
});
