import { defineManifestContract } from "./manifest.contract";

export const separatorContract = defineManifestContract({
	id: "ui.separator.contract",
	component: "ui.separator",
	purpose:
		"Provides visual or semantic separation between adjacent ERP content groups inside Cards, headers, and toolbars — not a page spacer.",
	ownership: {
		componentOwns: [
			"Horizontal or vertical separator rendering and optional separator semantics.",
		],
		consumerOwns: [
			"Grouping meaning, orientation, decorative-versus-semantic choice, and surrounding spacing.",
		],
	},
	semanticBoundaries: [
		"A visual line does not create a heading, region, or ownership boundary.",
		"Separator orientation does not determine content reading order.",
		"Separator does not replace SectionHeader or page structure.",
	],
	rules: [
		"Use Separator when adjacent groups require a visible boundary beyond spacing.",
		"Mark decorative separators appropriately — default decorative hides semantics from assistive technologies.",
		"Prefer headings and whitespace for major information hierarchy.",
		"Use vertical orientation for peer labels in a single toolbar row.",
		"Keep separators sparse — one clear boundary beats dense line stacks.",
	],
	accessibility: [
		"Expose separator semantics only when the boundary is meaningful.",
		"Hide purely decorative separators from assistive technologies.",
		"Preserve the correct horizontal or vertical orientation.",
	],
	prohibitedUsage: [
		"Do not use Separator as a generic spacing primitive.",
		"Do not create dense line-heavy layouts where grouping is unclear.",
		"Do not substitute a separator for a semantic heading or region.",
		"Do not encode workflow stages with separators — use Stepper.",
		"Do not place Separators where Card sectioning or whitespace already clarifies groups.",
	],
});
