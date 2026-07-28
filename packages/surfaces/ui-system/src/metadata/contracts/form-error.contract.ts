import { defineManifestContract } from "./manifest.contract";

export const formErrorContract = defineManifestContract({
	id: "ui.form-error.contract",
	component: "ui.form-error",
	purpose:
		"Presents concise form-level error, warning, or informational feedback.",
	ownership: {
		componentOwns: [
			"Form feedback presentation, approved severity treatments, optional iconography, and message structure.",
		],
		consumerOwns: [
			"Error derivation, server mapping, severity, announcement strategy, and recovery workflow.",
		],
	},
	semanticBoundaries: [
		"Visual severity does not determine whether submission is blocked.",
		"Rendered feedback does not replace field-level associations or domain error handling.",
	],
	approvedVariants: {
		default: {
			meaning: "Submission-blocking or failed form feedback.",
			allowedWhen: ["The current form state contains a confirmed error."],
		},
		warning: {
			meaning: "Attention-needed form feedback.",
			allowedWhen: [
				"Submission may continue but the user should review a known condition.",
			],
		},
		info: {
			meaning: "Neutral form guidance.",
			allowedWhen: [
				"The message explains submission context without reporting failure or risk.",
			],
		},
	},
	approvedSizes: {
		sm: {
			meaning: "Compact feedback text.",
			allowedWhen: ["Dense forms require subordinate feedback."],
		},
		md: {
			meaning: "Default feedback text.",
			allowedWhen: ["Ordinary form feedback is displayed."],
		},
		lg: {
			meaning: "Prominent feedback text.",
			allowedWhen: [
				"A sparse form requires strongly visible summary feedback.",
			],
		},
	},
	rules: [
		"Use one authoritative form-level message for the current submission outcome.",
		"Write actionable feedback that identifies what the user can do next.",
		"Keep field-specific corrections with their associated fields.",
	],
	accessibility: [
		"Coordinate announcements with the form strategy to avoid duplicate live-region output.",
		"Do not rely on color or iconography alone for severity.",
		"Keep recovery guidance available to keyboard and assistive-technology users.",
	],
	prohibitedUsage: [
		"Do not use FormError as decorative status text.",
		"Do not display conflicting server and client summaries for the same failure.",
		"Do not infer severity inside the reusable component.",
	],
});
