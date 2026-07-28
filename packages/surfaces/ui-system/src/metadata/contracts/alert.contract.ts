import { defineManifestContract } from "./manifest.contract";

export const alertContract = defineManifestContract({
	id: "ui.alert.contract",
	component: "ui.alert",
	purpose:
		"Presents persistent contextual notice or confirmed error feedback within a surface.",
	ownership: {
		componentOwns: [
			"Alert-region presentation, title-description composition, and approved neutral or destructive treatment.",
		],
		consumerOwns: [
			"Message severity, source, recovery guidance, visibility, dismissal, and domain policy.",
		],
	},
	semanticBoundaries: [
		"Destructive presentation does not determine workflow severity or blocking policy.",
		"An alert region does not automatically provide live announcement behavior.",
	],
	approvedVariants: {
		default: {
			meaning: "Neutral contextual notice.",
			allowedWhen: [
				"The message provides persistent information without confirmed failure.",
			],
		},
		destructive: {
			meaning: "Confirmed failure or harmful condition.",
			allowedWhen: [
				"The message reports a known error or destructive condition requiring attention.",
			],
		},
	},
	rules: [
		"Use Alert for persistent contextual feedback relevant to the surrounding surface.",
		"Provide a clear title when it improves scanning.",
		"Include recovery guidance when the user can correct the condition.",
	],
	accessibility: [
		"Ensure message meaning remains clear without color or iconography.",
		"Coordinate role and live announcements with the surrounding feedback strategy.",
		"Keep interactive recovery actions separately labelled and focusable.",
	],
	prohibitedUsage: [
		"Do not use Alert as a toast or modal substitute.",
		"Do not use destructive styling for ordinary emphasis.",
		"Do not repeatedly announce unchanged persistent alerts.",
	],
});
