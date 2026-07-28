import { defineManifestContract } from "./manifest.contract";

export const textareaContract = defineManifestContract({
	id: "ui.textarea.contract",
	component: "ui.textarea",
	purpose:
		"Provides multiline plain-text entry for notes, descriptions, and other governed ERP text.",
	ownership: {
		componentOwns: [
			"Native textarea rendering, multiline entry, resizing presentation, and accessibility-attribute forwarding.",
		],
		consumerOwns: [
			"Labelling, length policy, normalization, validation, permissions, persistence, and domain meaning.",
		],
	},
	semanticBoundaries: [
		"Multiline presentation does not imply rich-text or document semantics.",
		"Visible character capacity does not define persisted length or validation policy.",
	],
	rules: [
		"Use Textarea for plain multiline content and preserve the user's value after validation failure.",
		"State meaningful length or formatting constraints before submission.",
		"Use a specialized editor when structured or formatted content is required.",
	],
	accessibility: [
		"Associate the textarea with a visible label, description, and error.",
		"Preserve required, invalid, disabled, and read-only semantics.",
		"Do not use placeholder text as the only label or instruction.",
	],
	prohibitedUsage: [
		"Do not use Textarea for rich text, attachments, or structured records.",
		"Do not silently truncate or transform entered content.",
		"Do not use disabled when read-only review and submission are intended.",
	],
});
