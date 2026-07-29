import { defineManifestContract } from "./manifest.contract";

export const textareaContract = defineManifestContract({
	id: "ui.textarea.contract",
	component: "ui.textarea",
	purpose:
		"Provides multiline plain-text entry for ERP notes, remittance advice, rejection reasons, and other governed text — without owning labelling, length policy, rich text, or persistence.",
	ownership: {
		componentOwns: [
			"Native textarea rendering, multiline entry, resizing presentation, invalid chrome, and accessibility-attribute forwarding.",
		],
		consumerOwns: [
			"Labelling via FormField or Field, length policy, normalization, validation, permissions, persistence, and domain meaning.",
		],
	},
	semanticBoundaries: [
		"Multiline presentation does not imply rich-text or document semantics.",
		"Visible character capacity does not define persisted length or validation policy.",
		"Textarea does not replace Input for single-line values or a specialized editor for structured content.",
	],
	rules: [
		"Use Textarea for plain multiline content and preserve the user's value after validation failure.",
		"State meaningful length or formatting constraints before submission.",
		"Use a specialized editor when structured or formatted content is required.",
		"Pair with FormField for visible label, description, and error.",
		"Prefer Card composition for remittance notes and rejection reason workbenches.",
	],
	accessibility: [
		"Associate the textarea with a visible label, description, and error.",
		"Preserve required, invalid, disabled, and read-only semantics.",
		"Do not use placeholder text as the only label or instruction.",
		"Do not communicate invalid state through colour alone.",
		"Preserve visible keyboard focus treatment.",
	],
	prohibitedUsage: [
		"Do not use Textarea for rich text, attachments, or structured records.",
		"Do not silently truncate or transform entered content.",
		"Do not use disabled when read-only review and submission are intended.",
		"Do not rely on placeholder-only labelling for operator instruction.",
	],
});
