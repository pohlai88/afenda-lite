import { defineManifestContract } from "./manifest.contract";

export const badgeContract = defineManifestContract({
	id: "ui.badge.contract",
	component: "ui.badge",
	purpose:
		"Provides compact categorical, attribute, source, and policy labels for ERP directories and record chrome — taxonomy without lifecycle authority. StatusBadge owns approval, health, and operational state.",
	ownership: {
		componentOwns: [
			"Compact label presentation, approved visual variants (default, secondary, destructive, outline, ghost, link), and delegated link styling via asChild.",
		],
		consumerOwns: [
			"Governed domain vocabulary, category derivation, destination validity for link badges, authorization, label density, and pairing with StatusBadge for authoritative state.",
		],
	},
	semanticBoundaries: [
		"Visual emphasis does not make a label an authoritative lifecycle or operational state.",
		"Destructive styling classifies risk or exception tags — it does not mean error state, approval outcome, or required action.",
		"Link styling does not determine whether navigation is permitted or available.",
		"Badge does not replace StatusBadge for posting, approval, health, or operational state.",
		"Badge has no independent size scale — denseness comes from surrounding layout.",
	],
	approvedVariants: {
		default: {
			meaning: "Prominent neutral categorical label.",
			allowedWhen: [
				"The label should be noticeable but does not represent an authoritative lifecycle or operational state.",
			],
			prohibitedWhen: [
				"The value is the current approval, posting, health, or availability state — use StatusBadge.",
			],
		},
		secondary: {
			meaning: "Low-emphasis neutral categorical label.",
			allowedWhen: [
				"The label supports scanning without competing with primary record content.",
			],
		},
		destructive: {
			meaning: "Risk or exception classification label.",
			allowedWhen: [
				"The label classifies content as high-risk, restricted, policy-exception, or otherwise negative without representing the authoritative lifecycle state.",
			],
			prohibitedWhen: [
				"The value represents the current operational, approval, health, or lifecycle state (for example Awaiting approval).",
				"The label is used as an error or failure outcome — use Alert, FormError, or StatusBadge as appropriate.",
			],
		},
		outline: {
			meaning: "Quiet metadata or categorical label.",
			allowedWhen: [
				"The label communicates secondary metadata rather than status — region, reference codes, import source.",
			],
		},
		ghost: {
			meaning: "Lowest-emphasis supporting label.",
			allowedWhen: [
				"The label appears in dense rows, repeated records, or supporting metadata.",
			],
			prohibitedWhen: [
				"The label must remain prominent for correct interpretation.",
				"The wording is conversational or subjective rather than governed vocabulary.",
			],
		},
		link: {
			meaning: "Categorical label presented as a semantic navigation link.",
			allowedWhen: [
				"The label navigates to a filtered, categorized, or related view with a real destination.",
				"Rendered with asChild onto a semantic anchor or framework Link.",
			],
			prohibitedWhen: [
				"The interaction mutates data, opens a command menu, or performs an in-place action.",
				"The badge uses link styling without an anchor — navigation semantics are missing.",
			],
		},
	},
	rules: [
		"Use Badge for categories, attributes, classifications, source markers, and supporting metadata.",
		"Use StatusBadge for authoritative lifecycle, approval, health, availability, or operational states.",
		"Use short, stable vocabulary defined by the owning domain — not free-form commentary.",
		"Use consistent casing and terminology for badges within the same domain.",
		"Keep primary record identity stronger than supporting Badge labels.",
		"Prefer structured text or fields when multiple badges would create visual noise.",
		"Compose link badges with asChild onto a real destination — never fake button click handlers.",
		"Treat destructive Badge as risk/exception classification only — never as lifecycle truth.",
	],
	accessibility: [
		"Badge text must communicate its meaning without relying on color.",
		"Linked badges must retain semantic link behavior and expose a clear accessible name.",
		"Decorative icons must not duplicate the badge text for assistive technologies.",
		"Meaningful icons must have an accessible relationship to the badge label.",
		"Long labels may wrap when layout requires — meaning must remain readable.",
	],
	prohibitedUsage: [
		"Do not use Badge as a button or command substitute.",
		"Do not use Badge alone for critical status communication.",
		"Do not use Badge for authoritative lifecycle, approval, health, or operational state.",
		"Do not encode meaning only through badge color.",
		"Do not overload a record with badges when ordinary metadata is clearer.",
		"Do not claim approval, posting success, or workflow completion through Badge wording or destructive styling.",
		"Do not simulate a link with variant=link and no anchor.",
		"Do not use conversational or subjective Badge copy.",
	],
});
