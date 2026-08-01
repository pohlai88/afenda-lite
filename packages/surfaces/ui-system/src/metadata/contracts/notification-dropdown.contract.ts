import { defineManifestContract } from "./manifest.contract";

export const notificationDropdownContract = defineManifestContract({
	id: "ui.notification-dropdown.contract",
	component: "ui.notification-dropdown",
	purpose:
		"Provides a responsive workspace notification review dialog with governed categories, empty states, actor presentation, timestamps, and optional decision ports without owning notification delivery or decision policy.",
	ownership: {
		componentOwns: [
			"Dialog disclosure, category navigation, scroll containment, actor fallback presentation, timestamp structure, empty presentation, and decision control placement.",
		],
		consumerOwns: [
			"Notification retrieval, category meaning, unread truth, actor identity, authorization, decision eligibility, mutation execution, persistence, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Read presentation does not mutate or establish delivery state.",
		"Decision buttons do not establish eligibility or successful execution.",
		"Notification categories do not define domain lifecycle.",
	],
	rules: [
		"Use Dialog, Tabs, ScrollArea, Avatar, Empty, Badge, and Button from the owned system.",
		"Render decision controls only when a real callback is supplied.",
		"Preserve semantic time values when machine-readable timestamps are available.",
	],
	accessibility: [
		"Expose a named dialog, labelled category tabs, named lists, and keyboard-operable decisions.",
		"Provide AvatarFallback text and visible notification wording.",
		"Restore focus to the trigger on dismissal through Dialog semantics.",
	],
	prohibitedUsage: [
		"Do not use a raw dialog or hand-rolled tablist.",
		"Do not show fake or disabled decision controls without product behavior.",
		"Do not treat notification presence as permission or lifecycle authority.",
	],
});
