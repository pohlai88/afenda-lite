import { defineManifestContract } from "./manifest.contract";

export const inputGroupContract = defineManifestContract({
	id: "ui.input-group.contract",
	component: "ui.input-group",
	purpose:
		"Composes one text control with tightly related prefixes, suffixes, text, and local actions.",
	ownership: {
		componentOwns: [
			"Unified control framing, addon alignment, focus presentation, and compact local-action sizing.",
		],
		consumerOwns: [
			"Field labelling, value handling, addon meaning, action behavior, validation, and permissions.",
		],
	},
	semanticBoundaries: [
		"A visual addon does not become part of the submitted value unless feature code defines it.",
		"Grouped presentation does not make unrelated controls one logical field.",
	],
	approvedVariants: {
		"inline-start": {
			meaning: "Leading inline addon.",
			allowedWhen: [
				"The addon precedes a single-line control without changing its value semantics.",
			],
		},
		"inline-end": {
			meaning: "Trailing inline addon.",
			allowedWhen: [
				"The addon follows a single-line control without obscuring its value.",
			],
		},
		"block-start": {
			meaning: "Addon above the control.",
			allowedWhen: [
				"Supporting content requires full-width placement before the control.",
			],
		},
		"block-end": {
			meaning: "Addon below the control.",
			allowedWhen: [
				"Supporting content requires full-width placement after the control.",
			],
		},
	},
	approvedSizes: {
		xs: {
			meaning: "Extra-compact text action.",
			allowedWhen: ["A labelled local action fits within the input group."],
		},
		sm: {
			meaning: "Compact text action.",
			allowedWhen: ["A local action needs standard compact emphasis."],
		},
		"icon-xs": {
			meaning: "Extra-compact icon action.",
			allowedWhen: ["A familiar icon action has an accessible name."],
		},
		"icon-sm": {
			meaning: "Compact icon action.",
			allowedWhen: [
				"A familiar icon action has an accessible name and adequate target size.",
			],
		},
	},
	rules: [
		"Use InputGroup only when addons directly explain or operate on one control.",
		"Keep interactive addons independently labelled and keyboard operable.",
		"Preserve the underlying Input or Textarea value and semantics.",
	],
	accessibility: [
		"Associate the underlying control with its external field label, description, and error.",
		"Give addon buttons explicit accessible names and visible focus.",
		"Do not place essential instructions only in non-focusable addon text.",
	],
	prohibitedUsage: [
		"Do not place multiple unrelated form controls in one InputGroup.",
		"Do not make addon text the only field label.",
		"Do not hide domain parsing or unit conversion inside the group component.",
	],
});
