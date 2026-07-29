import { defineManifestContract } from "./manifest.contract";

export const fieldContract = defineManifestContract({
	id: "ui.field.contract",
	component: "ui.field",
	purpose:
		"Provides composable field, fieldset, legend, label, description, separator, and error structure for ERP forms such as legal-company registration, supplier remittance, and invoice header edits — layout and association chrome, not domain validation.",
	ownership: {
		componentOwns: [
			"Field-family composition, FieldSet/FieldGroup structure, orientation variants, description placement, separator chrome, and FieldError presentation.",
		],
		consumerOwns: [
			"Control identity, validation rules, required policy, submission, permissions, and domain meaning of each value.",
		],
	},
	semanticBoundaries: [
		"Field grouping does not determine validation or submission boundaries.",
		"Responsive orientation does not change the semantic relationship between labels and controls.",
		"Invalid styling does not define the validation rule or its domain authority.",
		"Field does not own FormField one-control composition or StatusBadge lifecycle.",
	],
	approvedVariants: {
		vertical: {
			meaning: "Stacked field composition.",
			allowedWhen: [
				"The field needs the default readable label-to-control flow for ERP forms.",
			],
		},
		horizontal: {
			meaning: "Single-row field composition.",
			allowedWhen: [
				"Labels and compact controls remain understandable in one row on wide workspaces.",
			],
		},
		responsive: {
			meaning: "Container-responsive field composition.",
			allowedWhen: [
				"The same field must adapt between stacked and horizontal layouts inside a FieldGroup container.",
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
		"Use FieldSet and FieldLegend for logically labelled control groups such as legal identity or remittance bank details.",
		"Use one orientation consistently within a local form section unless responsive composition is required.",
		"Associate FieldLabel with a stable control id; keep FieldDescription helpful before an error appears.",
		"Keep FieldError specific to the associated field or group and actionable for the operator.",
		"Prefer FormField when composing one labelled control with wired aria-describedby; use Field when composing multi-part or fieldset structures.",
		"Use FieldSeparator only to divide related groups inside a FieldGroup — not as page chrome.",
		"Indicate invalid state on the Field (`data-invalid`) and on the underlying control together.",
	],
	accessibility: [
		"Use native fieldset and legend semantics for grouped choices and related identity fields.",
		"Associate labels, descriptions, and errors with their controls through stable identifiers.",
		"Preserve invalid and disabled semantics on the underlying controls.",
		"Do not communicate validation state through color alone — FieldError must remain text.",
		'Keep FieldError available to keyboard and assistive-technology users (`role="alert"`).',
		"Do not use placeholder text as the only field label or instruction.",
	],
	prohibitedUsage: [
		"Do not use Field as a generic layout or card spacing container.",
		"Do not substitute FieldTitle for a control label or fieldset legend.",
		"Do not encode validation, authorization, or submission logic inside the field family.",
		"Do not place unrelated page actions inside a FieldSet.",
		"Do not treat FieldError as form-level FormError or as StatusBadge lifecycle authority.",
		"Do not rely on orientation alone to imply required or optional meaning.",
	],
});
