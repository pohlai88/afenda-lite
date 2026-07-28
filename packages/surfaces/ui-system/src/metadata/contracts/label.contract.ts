import { defineManifestContract } from "./manifest.contract";

export const labelContract = defineManifestContract({
	id: "ui.label.contract",
	component: "ui.label",
	purpose: "Provides visible labelling for one associated form control.",
	ownership: {
		componentOwns: [
			"Label rendering, control association forwarding, and disabled presentation.",
		],
		consumerOwns: [
			"Label wording, stable control identity, required policy, and field composition.",
		],
	},
	semanticBoundaries: [
		"Label styling does not establish a programmatic control association.",
		"Required wording does not replace required semantics on the underlying control.",
	],
	rules: [
		"Use concise visible text that identifies the expected value or choice.",
		"Associate Label with exactly one control unless it labels a properly grouped fieldset elsewhere.",
		"Place instructions and examples in field descriptions rather than overloading the label.",
	],
	accessibility: [
		"Use htmlFor and a stable control id, or an equivalent native labelled relationship.",
		"Keep visible labels available unless an equally clear accessible name is required by the pattern.",
		"Do not communicate required or invalid state through color alone.",
	],
	prohibitedUsage: [
		"Do not use Label as generic typography.",
		"Do not use placeholder text instead of a label.",
		"Do not point one label at multiple unrelated controls.",
	],
});
