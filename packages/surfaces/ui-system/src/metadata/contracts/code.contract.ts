import { defineManifestContract } from "./manifest.contract";

export const codeContract = defineManifestContract({
	id: "ui.code.contract",
	component: "ui.code",
	purpose:
		"Displays short code, identifier, command, or machine-readable value with consistent monospace treatment.",
	ownership: {
		componentOwns: [
			"Inline code presentation, monospace styling, wrapping behavior, and semantic element forwarding.",
		],
		consumerOwns: [
			"Value accuracy, sensitivity, redaction, copy behavior, and domain meaning.",
		],
	},
	semanticBoundaries: [
		"Monospace treatment does not make a value safe to expose or executable.",
		"Displayed code does not establish canonical identifier formatting.",
	],
	rules: [
		"Use Code for short machine-oriented values that benefit from character distinction.",
		"Preserve exact characters and meaningful whitespace.",
		"Use a dedicated code block or table for long structured content.",
	],
	accessibility: [
		"Ensure the value remains readable at zoom and high contrast.",
		"Provide surrounding context for unexplained identifiers.",
		"Label copy actions separately when supplied by the consumer.",
	],
	prohibitedUsage: [
		"Do not display secrets, tokens, or unredacted sensitive identifiers.",
		"Do not use Code as generic small text.",
		"Do not silently truncate values whose suffix or prefix is significant.",
	],
});
