import { defineManifestContract } from "./manifest.contract";

export const codeContract = defineManifestContract({
	id: "ui.code.contract",
	component: "ui.code",
	purpose:
		"Displays short ERP machine-oriented values — invoice numbers, organization IDs, commands, and error codes — with consistent monospace treatment so characters stay distinguishable.",
	ownership: {
		componentOwns: [
			"Inline code presentation, monospace styling, wrapping behavior, and semantic code-element forwarding.",
		],
		consumerOwns: [
			"Value accuracy, sensitivity, redaction, copy behavior, surrounding context, and domain meaning.",
		],
	},
	semanticBoundaries: [
		"Monospace treatment does not make a value safe to expose, executable, or authoritative.",
		"Displayed code does not establish canonical identifier formatting or prove ledger identity.",
		"Code does not replace Badge for taxonomy, StatusBadge for lifecycle, or a dedicated code block for long structured content.",
	],
	rules: [
		"Use Code for short machine-oriented values that benefit from character distinction — IDs, slugs, paths, commands, and error codes.",
		"Preserve exact characters and meaningful whitespace.",
		"Provide surrounding prose or a labelled field so unexplained identifiers remain interpretable.",
		"Use a dedicated code block, preformatted region, or table for long structured payloads.",
		"Keep destructive colour overrides reserved for confirmed error codes — not ordinary identifiers.",
	],
	accessibility: [
		"Ensure the value remains readable at zoom and high contrast.",
		"Provide surrounding context for unexplained identifiers.",
		"Label copy actions separately when supplied by the consumer.",
		"Do not rely on monospace or colour alone to communicate severity — pair error codes with clear prose.",
	],
	prohibitedUsage: [
		"Do not display secrets, tokens, or unredacted sensitive identifiers.",
		"Do not use Code as generic small text or body copy.",
		"Do not silently truncate values whose suffix or prefix is significant.",
		"Do not use Code as a StatusBadge or Badge substitute.",
		"Do not present long multi-line logs or JSON blobs inside inline Code.",
	],
});
