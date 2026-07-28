import { defineManifestContract } from "./manifest.contract";

export const separatorContract = defineManifestContract({
	id: "ui.separator.contract",
	component: "ui.separator",
	purpose:
		"Provides visual or semantic separation between adjacent content groups.",
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
	],
	rules: [
		"Use Separator when adjacent groups require a visible boundary beyond spacing.",
		"Mark decorative separators appropriately.",
		"Prefer headings and whitespace for major information hierarchy.",
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
	],
});
