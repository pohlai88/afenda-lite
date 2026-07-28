import { defineManifestContract } from "./manifest.contract";

export const sonnerContract = defineManifestContract({
	id: "ui.sonner.contract",
	component: "ui.sonner",
	purpose:
		"Provides the application toast viewport and consistent transient-notification presentation.",
	ownership: {
		componentOwns: [
			"Toast viewport placement, theme integration, stacking, dismissal presentation, and transient message rendering.",
		],
		consumerOwns: [
			"Notification creation, severity, wording, duration, deduplication, actions, and outcome truth.",
		],
	},
	semanticBoundaries: [
		"Toast styling does not determine whether an operation succeeded or failed.",
		"Transient visibility does not make information suitable as the only record of an outcome.",
	],
	rules: [
		"Mount one Toaster at the application composition root.",
		"Use concise outcome-focused messages and deduplicate repeated events.",
		"Keep durable or actionable failures visible in the affected workflow as well.",
	],
	accessibility: [
		"Coordinate polite and assertive announcements with message severity.",
		"Avoid repeated announcements for identical outcomes.",
		"Provide keyboard-accessible actions and sufficient time to use them.",
	],
	prohibitedUsage: [
		"Do not use toast messages as the only presentation of validation errors.",
		"Do not claim success before the authoritative command succeeds.",
		"Do not mount competing toast viewports in feature code.",
	],
});
