import { defineManifestContract } from "./manifest.contract";

export const progressContract = defineManifestContract({
	id: "ui.progress.contract",
	component: "ui.progress",
	purpose:
		"Presents determinate completion progress for a known bounded operation.",
	ownership: {
		componentOwns: [
			"Progressbar rendering, bounded value presentation, and accessibility-attribute forwarding.",
		],
		consumerOwns: [
			"Progress calculation, operation status, total work, polling, cancellation, and failure handling.",
		],
	},
	semanticBoundaries: [
		"Displayed percentage does not prove completion, success, or persistence.",
		"A full bar does not determine that the server operation has committed.",
	],
	rules: [
		"Use Progress only when a meaningful bounded value is known.",
		"Provide accompanying text when users need the operation name or exact value.",
		"Use Spinner or another indeterminate state when total progress is unknown.",
	],
	accessibility: [
		"Provide an accessible name and current, minimum, and maximum value semantics.",
		"Avoid announcing every insignificant progress change.",
		"Communicate completion and failure separately from visual fill.",
	],
	prohibitedUsage: [
		"Do not fabricate percentage values for indeterminate work.",
		"Do not use Progress as a decorative chart.",
		"Do not treat visual completion as authoritative command success.",
	],
});
