import { defineManifestContract } from "./manifest.contract";

export const inputGroupContract = defineManifestContract({
	id: "ui.input-group.contract",
	component: "ui.input-group",
	purpose:
		"Composes one ERP text control with tightly related prefixes, suffixes, supporting text, and local actions — currency framing, reference copy, or clear — without owning field labelling, validation, or domain parsing.",
	ownership: {
		componentOwns: [
			"Unified control framing, addon alignment, focus presentation, compact local-action sizing, and grouped focus/invalid chrome.",
		],
		consumerOwns: [
			"Field labelling via FormField or equivalent, value handling, addon meaning, action behavior, validation, permissions, and posting.",
		],
	},
	semanticBoundaries: [
		"A visual addon does not become part of the submitted value unless feature code defines that mapping.",
		"Grouped presentation does not make unrelated controls one logical field.",
		"InputGroup does not replace FormField for labelling, NumericInput for quantified domain entry, or Button for primary commands.",
	],
	approvedVariants: {
		"inline-start": {
			meaning: "Leading inline addon before a single-line control.",
			allowedWhen: [
				"The addon precedes one control and explains unit, currency, or iconography without changing value semantics.",
			],
		},
		"inline-end": {
			meaning: "Trailing inline addon after a single-line control.",
			allowedWhen: [
				"The addon follows one control for currency, unit, or a labelled local action without obscuring the value.",
			],
		},
		"block-start": {
			meaning: "Full-width addon above the control.",
			allowedWhen: [
				"Supporting content requires full-width placement before Input or Textarea.",
			],
		},
		"block-end": {
			meaning: "Full-width addon below the control.",
			allowedWhen: [
				"Supporting content or local actions require full-width placement after Input or Textarea.",
			],
		},
	},
	approvedSizes: {
		xs: {
			meaning: "Extra-compact labelled local action inside the group.",
			allowedWhen: [
				"A short labelled action fits within the input group chrome.",
			],
		},
		sm: {
			meaning: "Compact labelled local action inside the group.",
			allowedWhen: ["A local action needs standard compact emphasis."],
		},
		"icon-xs": {
			meaning: "Extra-compact icon action inside the group.",
			allowedWhen: ["A familiar icon action has an explicit accessible name."],
		},
		"icon-sm": {
			meaning: "Compact icon action inside the group.",
			allowedWhen: [
				"A familiar icon action has an accessible name and adequate target size.",
			],
		},
	},
	rules: [
		"This contract governs InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea, InputGroupText, and InputGroupButton as one family.",
		"Use InputGroup only when addons directly explain or operate on one control.",
		"Keep interactive addons independently labelled and keyboard operable.",
		"Preserve the underlying Input or Textarea value and semantics — do not encode domain parsing in the group.",
		"Pair the grouped control with an external FormField label, description, and error.",
		"Prefer Card + FormField composition for remittance, allocation, and reference entry workbenches.",
	],
	accessibility: [
		"Associate the underlying control with its external field label, description, and error.",
		"Give addon buttons explicit accessible names and visible focus.",
		"Do not place essential instructions only in non-focusable addon text.",
		"Surface invalid state on the control so the group can present destructive focus chrome.",
		"Do not communicate required or invalid state through colour alone.",
	],
	prohibitedUsage: [
		"Do not place multiple unrelated form controls in one InputGroup.",
		"Do not make addon text the only field label.",
		"Do not hide domain parsing, unit conversion, or FX inside the group component.",
		"Do not use InputGroup as a substitute for primary page commands or posting actions.",
		"Do not omit accessible names on icon-only InputGroupButton actions.",
	],
});
