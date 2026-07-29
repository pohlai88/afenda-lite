import { defineManifestContract } from "./manifest.contract";

export const formErrorContract = defineManifestContract({
	id: "ui.form-error.contract",
	component: "ui.form-error",
	purpose:
		"Presents one concise form-level error, warning, or informational summary for ERP submissions — supplier registration, invoice posting, or remittance — without owning field associations or blocking policy.",
	ownership: {
		componentOwns: [
			"Form-level feedback presentation, approved severity treatments, size denseness, optional iconography, alert role, and null render when no message is provided.",
		],
		consumerOwns: [
			"Error derivation, server mapping, severity selection, announcement coordination with field errors, recovery workflow, and whether submission is blocked.",
		],
	},
	semanticBoundaries: [
		"Visual severity does not determine whether submission is blocked.",
		"Rendered feedback does not replace field-level associations or domain error handling.",
		"FormError is form-summary chrome — it does not prove server rejection or authorize retry.",
		"Absence of FormError (null when empty) does not prove the form is valid.",
	],
	approvedVariants: {
		default: {
			meaning: "Submission-blocking or failed form feedback.",
			allowedWhen: [
				"The current form state contains a confirmed error that operators must resolve.",
			],
			prohibitedWhen: [
				"The message is only advisory and submission may continue — use warning or info.",
				"The outcome is successful approval — do not encode success in FormError.",
			],
		},
		warning: {
			meaning: "Attention-needed form feedback.",
			allowedWhen: [
				"Submission may continue but the operator should review a known condition.",
			],
			prohibitedWhen: [
				"The form has a confirmed blocking failure — use default.",
			],
		},
		info: {
			meaning: "Neutral form guidance.",
			allowedWhen: [
				"The message explains submission context without reporting failure or risk.",
			],
			prohibitedWhen: [
				"The message reports a confirmed failure — use default.",
			],
		},
	},
	approvedSizes: {
		sm: {
			meaning: "Compact feedback text.",
			allowedWhen: ["Dense forms require subordinate form-level feedback."],
			prohibitedWhen: [
				"A sparse critical failure needs prominent summary — use md or lg.",
			],
		},
		md: {
			meaning: "Default feedback text.",
			allowedWhen: ["Ordinary form-level feedback is displayed."],
		},
		lg: {
			meaning: "Prominent feedback text.",
			allowedWhen: [
				"A sparse form requires strongly visible summary feedback.",
			],
			prohibitedWhen: [
				"Dense multi-field forms already carry field errors — prefer sm or md.",
			],
		},
	},
	rules: [
		"Use one authoritative form-level message for the current submission outcome.",
		"Write actionable feedback that identifies what the operator can do next.",
		"Keep field-specific corrections with their associated fields (FormField error) — do not duplicate them only in FormError.",
		"Omit FormError when there is no message — the component returns null.",
		"Select variant from feature-owned severity; do not infer severity inside the component.",
	],
	accessibility: [
		"FormError exposes role=alert with polite live updates — coordinate with field errors to avoid duplicate announcements.",
		"Do not rely on color or iconography alone for severity — keep the message text actionable.",
		"Keep recovery guidance available to keyboard and assistive-technology users.",
		"Prefer showIcon for visual scanning; never make the icon the sole severity cue.",
	],
	prohibitedUsage: [
		"Do not use FormError as decorative status text.",
		"Do not display conflicting server and client summaries for the same failure.",
		"Do not infer severity inside the reusable component.",
		"Do not replace field-level FormField errors with only a form-level FormError.",
		"Do not encode lifecycle or approval success in FormError — use StatusBadge or Alert for page notices.",
	],
});
