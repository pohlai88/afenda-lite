import { defineManifestContract } from "./manifest.contract";

export const labelContract = defineManifestContract({
	id: "ui.label.contract",
	component: "ui.label",
	purpose:
		"Provides the visible accessible name for one associated ERP form control such as legal name, tax registration, or remittance account — association chrome, not field layout or validation.",
	ownership: {
		componentOwns: [
			"Label rendering, control association forwarding (htmlFor), and disabled presentation when the control or group is disabled.",
		],
		consumerOwns: [
			"Label wording, stable control identity, required policy, field composition (Field / FormField), and domain meaning.",
		],
	},
	semanticBoundaries: [
		"Label styling does not establish a programmatic control association without htmlFor or nesting.",
		"Required wording or destructive color does not replace required or invalid semantics on the underlying control.",
		"Label does not own FieldDescription, FieldError, FormField wiring, or StatusBadge lifecycle.",
	],
	rules: [
		"Use concise visible text that identifies the expected value or choice for operators.",
		"Associate Label with exactly one control via htmlFor and a stable id, or wrap a single control when the pattern requires nesting.",
		"Place instructions and examples in FieldDescription / FormField description — do not overload the label.",
		"Indicate required fields consistently across the form; keep required semantics on the control itself.",
		"Prefer FieldLabel or FormField when composing a full ERP field; use Label for standalone control naming when those families are not in play.",
	],
	accessibility: [
		"Use htmlFor and a stable control id, or an equivalent native labelled relationship.",
		"Keep visible labels available unless an equally clear accessible name is required by the pattern.",
		"Do not communicate required or invalid state through color alone.",
		"Preserve disabled presentation when the associated control is disabled (peer-disabled / group-disabled).",
		"Do not use placeholder text as the only label.",
	],
	prohibitedUsage: [
		"Do not use Label as generic typography, section headings, or Card titles.",
		"Do not use placeholder text instead of a label.",
		"Do not point one label at multiple unrelated controls.",
		"Do not rely on text-destructive alone to mean required or invalid.",
		"Do not encode approval or lifecycle meaning in Label chrome — use StatusBadge on the record.",
	],
});
