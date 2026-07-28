import { defineManifestContract } from "./manifest.contract";

export const badgeContract = defineManifestContract({
	id: "ui.badge.contract",
	component: "ui.badge",
	purpose:
		"Provides compact categorical, attribute, and non-authoritative metadata labels.",
	ownership: {
		componentOwns: [
			"Compact label presentation, approved visual variants, and delegated link styling.",
		],
		consumerOwns: [
			"Domain vocabulary, category derivation, destination validity, and authorization.",
		],
	},
	semanticBoundaries: [
		"Visual emphasis does not make a label an authoritative lifecycle or operational state.",
		"Destructive styling does not determine severity, workflow policy, or required action.",
		"Link styling does not determine whether navigation is permitted or available.",
	],
	approvedVariants: {
		default: {
			meaning: "Prominent neutral categorical label.",
			allowedWhen: [
				"The label should be noticeable but does not represent an authoritative lifecycle or operational state.",
			],
		},
		secondary: {
			meaning: "Low-emphasis neutral categorical label.",
			allowedWhen: [
				"The label supports scanning without competing with primary record content.",
			],
		},
		destructive: {
			meaning: "Negative or risk-related categorical label.",
			allowedWhen: [
				"The label classifies content as high-risk, restricted, exception-tagged, or otherwise negative without representing the authoritative lifecycle state.",
			],
			prohibitedWhen: [
				"The value represents the current operational, approval, health, or lifecycle state.",
			],
		},
		outline: {
			meaning: "Quiet metadata or categorical label.",
			allowedWhen: [
				"The label communicates secondary metadata rather than status.",
			],
		},
		ghost: {
			meaning: "Lowest-emphasis supporting label.",
			allowedWhen: [
				"The label appears in dense rows, repeated records, or supporting metadata.",
			],
			prohibitedWhen: [
				"The label must remain prominent for correct interpretation.",
			],
		},
		link: {
			meaning: "Categorical label presented as a semantic navigation link.",
			allowedWhen: [
				"The label navigates to a filtered, categorized, or related view with a real destination.",
			],
			prohibitedWhen: [
				"The interaction mutates data, opens a command menu, or performs an in-place action.",
				"The badge is rendered with button semantics instead of a semantic anchor or framework Link.",
			],
		},
	},
	rules: [
		"Use Badge for categories, attributes, classifications, and supporting metadata.",
		"Use StatusBadge for authoritative lifecycle, approval, health, availability, or operational states.",
		"Use short, stable vocabulary defined by the owning domain.",
		"Use consistent casing and terminology for badges within the same domain.",
		"Prefer structured text or fields when multiple badges would create visual noise.",
	],
	accessibility: [
		"Badge text must communicate its meaning without relying on color.",
		"Linked badges must retain semantic link behavior and expose a clear accessible name.",
		"Decorative icons must not duplicate the badge text for assistive technologies.",
		"Meaningful icons must have an accessible relationship to the badge label.",
	],
	prohibitedUsage: [
		"Do not use Badge as a button or command substitute.",
		"Do not use Badge alone for critical status communication.",
		"Do not use Badge for authoritative lifecycle, approval, health, or operational state.",
		"Do not encode meaning only through badge color.",
		"Do not overload a record with badges when ordinary metadata is clearer.",
	],
});
