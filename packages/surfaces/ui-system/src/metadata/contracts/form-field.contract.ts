import { defineManifestContract } from "./manifest.contract";

export const formFieldContract = defineManifestContract({
	id: "ui.form-field.contract",
	component: "ui.form-field",
	purpose:
		"Composes one ERP form field from its label, control, supporting description, requirement marker, and field-level validation feedback — supplier identity, remittance references, and policy forms — without owning domain validation or submission.",
	ownership: {
		componentOwns: [
			"One field's label composition, control id association, description and error wiring (aria-describedby / aria-invalid), requirement presentation, and FormError placement when error is set.",
		],
		consumerOwns: [
			"Validation rules, touched and dirty state, server-error mapping, authorization, submission, and domain requirements.",
		],
	},
	semanticBoundaries: [
		"Invalid presentation does not define the validation rule or its domain authority.",
		"Required presentation does not determine whether a value is required by business policy.",
		"Disabled presentation does not imply that an existing value should be hidden or excluded from review.",
		"FormField clones a single child control for id and ARIA association — it does not own query, save, or permission outcomes.",
	],
	rules: [
		"This contract governs FormField, FormInput, and FormTextarea as one field-composition family.",
		"FormInput and FormTextarea provide control aliases; they do not add labels, descriptions, validation, or workflow behavior by themselves.",
		"Use FormField for one logical field when a larger form-library abstraction is unnecessary.",
		"Associate the field label, description, and error content through stable control identifiers (fieldId or generated id).",
		"Keep validation messages specific, actionable, and written in terms the operator can correct.",
		"Show at most one authoritative field-level error message for the current validation state.",
		"Feature code owns validation rules, authorization, submission behavior, and domain policy.",
		"Use read-only when a value remains reviewable but cannot be changed; use disabled only when the control must not participate in interaction or submission.",
		"Indicate required fields consistently across the form and preserve required semantics on the underlying control.",
		"Keep help text useful before an error occurs; do not use it merely to restate the label.",
		"Do not duplicate id, aria-invalid, or aria-describedby on children — FormField sets them when cloning.",
	],
	accessibility: [
		"Programmatically associate the label with the underlying form control.",
		"Associate supporting descriptions and validation errors with the control using aria-describedby.",
		"Preserve required, invalid, disabled, and read-only semantics on the underlying control.",
		"Do not communicate validation state through color alone.",
		"Ensure error content remains available to keyboard and assistive-technology users.",
		"Do not use placeholder text as the only field label or instruction.",
		"When an error appears after submission, coordinate announcements with form-level FormError to avoid duplicate live-region noise.",
	],
	prohibitedUsage: [
		"Do not use FormField as a generic spacing or layout container.",
		"Do not place multiple controls inside one FormField because the current composition assigns one control identifier; use FieldSet and FieldLegend for a logically labelled control group.",
		"Do not encode domain validation, permissions, or submission logic inside FormField.",
		"Do not display conflicting client-side and server-side error messages for the same field.",
		"Do not hide an existing value by disabling a field when read-only presentation is the intended behavior.",
		"Do not use placeholder text as a substitute for a visible or accessible label.",
		"Do not encode lifecycle or approval success in FormField chrome — use StatusBadge on the record.",
	],
});
