import { defineManifestContract } from "./manifest.contract";

export const spinnerContract = defineManifestContract({
	id: "ui.spinner.contract",
	component: "ui.spinner",
	purpose:
		"Provides an indeterminate visual indicator for short-running asynchronous activity.",
	ownership: {
		componentOwns: [
			"Spinner animation, approved sizing, color inheritance, and decorative loading presentation.",
		],
		consumerOwns: [
			"Loading detection, accessible status text, timeout, cancellation, error, and completion handling.",
		],
	},
	semanticBoundaries: [
		"Spinner motion does not identify the operation or prove that progress continues.",
		"Stopping animation does not determine success or failure.",
	],
	approvedVariants: {
		default: {
			meaning: "Primary loading emphasis.",
			allowedWhen: ["An active operation needs the standard loading color."],
		},
		secondary: {
			meaning: "Muted loading emphasis.",
			allowedWhen: [
				"Loading is subordinate to nearby content or control text.",
			],
		},
		destructive: {
			meaning: "Destructive-context loading emphasis.",
			allowedWhen: ["A supplied pending operation is explicitly destructive."],
			prohibitedWhen: [
				"Color is being used as the only description of the operation.",
			],
		},
	},
	approvedSizes: {
		sm: {
			meaning: "Compact loading indicator.",
			allowedWhen: [
				"A button or dense inline region supplies adjacent loading context.",
			],
		},
		md: {
			meaning: "Default loading indicator.",
			allowedWhen: ["An ordinary bounded region is loading."],
		},
		lg: {
			meaning: "Prominent loading indicator.",
			allowedWhen: [
				"A sparse major region requires a visible indeterminate state.",
			],
		},
		xl: {
			meaning: "Large region loading indicator.",
			allowedWhen: [
				"A sparse full-region loading state needs stronger visibility.",
			],
		},
	},
	rules: [
		"Use Spinner for indeterminate activity and pair it with enough context to identify the operation.",
		"Use Progress when a meaningful bounded value is available.",
		"Transition to explicit error, empty, or ready content when loading ends.",
	],
	accessibility: [
		"Provide loading status text through the owning control or region.",
		"Hide a redundant decorative spinner from assistive technologies.",
		"Respect reduced-motion preferences.",
	],
	prohibitedUsage: [
		"Do not use Spinner as the only accessible loading message.",
		"Do not leave it visible after an operation fails.",
		"Do not infer operation status inside the primitive.",
	],
});
