import { defineManifestContract } from "./manifest.contract";

export const nativeSelectContract = defineManifestContract({
	id: "ui.native-select.contract",
	component: "ui.native-select",
	purpose: "Provides browser-native selection from a small bounded option set.",
	ownership: {
		componentOwns: [
			"Native select rendering, option semantics, attribute forwarding, and consistent control presentation.",
		],
		consumerOwns: [
			"Option vocabulary, stable values, selected value, validation, permissions, and persistence.",
		],
	},
	semanticBoundaries: [
		"A listed option does not imply authorization or domain eligibility.",
		"Native selection does not determine how empty or unknown values are persisted.",
	],
	approvedSizes: {
		default: {
			meaning: "Standard native select control.",
			allowedWhen: ["The control appears in an ordinary form field."],
		},
		sm: {
			meaning: "Compact native select control.",
			allowedWhen: [
				"A dense form or toolbar preserves label and target clarity.",
			],
		},
	},
	rules: [
		"Use NativeSelect for small option sets that do not require search or rich option content.",
		"Use stable option values independent of translated display labels.",
		"Represent an optional empty value explicitly when the domain permits no selection.",
	],
	accessibility: [
		"Associate the select with a visible label, description, and error as applicable.",
		"Preserve native disabled, required, invalid, and keyboard semantics.",
		"Keep option labels distinct and understandable without visual grouping alone.",
	],
	prohibitedUsage: [
		"Do not use NativeSelect for searchable or very large collections.",
		"Do not use translated labels as persistent values.",
		"Do not include unauthorized options as a substitute for server authorization.",
	],
});
