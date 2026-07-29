import { defineManifestContract } from "./manifest.contract";

export const alertContract = defineManifestContract({
	id: "ui.alert.contract",
	component: "ui.alert",
	purpose:
		"Presents persistent in-surface ERP notices — operational guidance, quiet completion, or confirmed failure — so operators can act without leaving the current page or Card.",
	ownership: {
		componentOwns: [
			"Alert-region presentation, title and description composition, and approved default or destructive treatment.",
		],
		consumerOwns: [
			"Message severity, source of truth, recovery guidance, visibility and dismissal policy, live-region strategy, and domain blocking rules.",
		],
	},
	semanticBoundaries: [
		"Destructive styling does not authorize workflow blocking — feature policy decides whether posting or submission must stop.",
		"An Alert region does not automatically provide polite or assertive live announcements; consumers coordinate role and aria-live with the page feedback strategy.",
		"Alert does not replace StatusBadge for lifecycle state, Toast for transient feedback, Dialog for focused edits, or AlertDialog for irreversible confirmation.",
	],
	approvedVariants: {
		default: {
			meaning: "Neutral contextual notice without confirmed failure.",
			allowedWhen: [
				"The message provides persistent operational guidance or quiet completion on the surrounding surface.",
			],
			prohibitedWhen: [
				"The message reports a confirmed blocking failure that requires destructive treatment.",
				"The message is a one-shot toast that should disappear after acknowledgement.",
			],
		},
		destructive: {
			meaning: "Confirmed failure or harmful condition requiring attention.",
			allowedWhen: [
				"The message reports a known error, period lock, posting failure, or other harmful condition the operator must address.",
			],
			prohibitedWhen: [
				"The outcome is successful approval, quiet completion, or ordinary emphasis.",
				"The operator must confirm irreversible harm — use AlertDialog instead.",
			],
		},
	},
	rules: [
		"Use Alert for persistent contextual feedback relevant to the surrounding ERP surface.",
		"Provide a clear AlertTitle when operators must scan or recover; keep AlertDescription actionable.",
		"Include a single recovery action when the operator can correct the condition from this surface.",
		"Reserve destructive for confirmed failure or harm — never for successful approval.",
		"Prefer page or Card placement; do not use Alert as a modal, toast, or status-badge substitute.",
		"Keep icons supportive — meaning must remain clear from title and description alone.",
	],
	accessibility: [
		"Ensure message meaning remains clear without color or iconography alone.",
		"Coordinate role and live announcements with the surrounding feedback strategy — use role=alert for urgent failures and role=status for non-blocking completion when the page strategy requires it.",
		"Keep interactive recovery actions separately labelled, keyboard operable, and focusable.",
		"Do not repeatedly announce unchanged persistent alerts on every re-render.",
	],
	prohibitedUsage: [
		"Do not use Alert as a toast, modal, or AlertDialog substitute.",
		"Do not use destructive styling for ordinary emphasis or successful outcomes.",
		"Do not omit AlertTitle when recovery or scanning depends on a clear subject.",
		"Do not encode posting lifecycle as the only status signal — use StatusBadge for record state.",
		"Do not place multi-step workflows or complex forms inside an Alert.",
	],
});
