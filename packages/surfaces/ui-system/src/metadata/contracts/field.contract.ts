import { defineManifestContract } from "./manifest.contract";

export const fieldContract = defineManifestContract({
	id: "ui.field.contract",
	component: "ui.field",
	purpose:
		"Provides composable field, fieldset, legend, label, description, and error structure for ERP forms.",
	ownership: {
		componentOwns: [
			"Field-family composition, grouping semantics, orientation, description placement, and error presentation.",
		],
		consumerOwns: [
			"Control identity, validation rules, required policy, submission, permissions, and domain meaning.",
		],
	},
	semanticBoundaries: [
		"Field grouping does not determine validation or submission boundaries.",
		"Responsive orientation does not change the semantic relationship between labels and controls.",
	],
	approvedVariants: {
		vertical: {
			meaning: "Stacked field composition.",
			allowedWhen: [
				"The field needs the default readable label-to-control flow.",
			],
		},
		horizontal: {
			meaning: "Single-row field composition.",
			allowedWhen: [
				"Labels and compact controls remain understandable in one row.",
			],
		},
		responsive: {
			meaning: "Container-responsive field composition.",
			allowedWhen: [
				"The same field must adapt between stacked and horizontal layouts.",
			],
		},
		legend: {
			meaning: "Fieldset legend treatment.",
			allowedWhen: ["FieldLegend names a semantic group of related controls."],
		},
		label: {
			meaning: "Compact legend treatment aligned with field labels.",
			allowedWhen: ["A semantic fieldset needs label-scale visual hierarchy."],
		},
	},
	rules: [
		"Use FieldSet and FieldLegend for logically labelled control groups.",
		"Use one orientation consistently within a local form section unless responsive composition is required.",
		"Keep errors specific to the associated field or group.",
	],
	accessibility: [
		"Use native fieldset and legend semantics for grouped choices.",
		"Associate labels, descriptions, and errors with their controls.",
		"Preserve invalid and disabled semantics on the underlying controls.",
	],
	prohibitedUsage: [
		"Do not use Field as a generic layout container.",
		"Do not substitute FieldTitle for a control label or fieldset legend.",
		"Do not encode validation or authorization logic inside the field family.",
	],
});
