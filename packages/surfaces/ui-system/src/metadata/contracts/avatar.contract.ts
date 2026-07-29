import { defineManifestContract } from "./manifest.contract";

export const avatarContract = defineManifestContract({
	id: "ui.avatar.contract",
	component: "ui.avatar",
	purpose:
		"Marks a person or entity identity in ERP directories, record headers, and approval trails through image, initials fallback, optional decorative badge, and compact group composition.",
	ownership: {
		componentOwns: [
			"Avatar framing, size presentation, image and fallback composition, decorative badge placement, grouped overlap, and overflow count display.",
		],
		consumerOwns: [
			"Identity data, image URL policy, fallback initials or label, privacy, authoritative presence or lifecycle meaning, and any navigation behavior.",
		],
	},
	semanticBoundaries: [
		"An image or initials fallback does not establish authenticated identity or authorization.",
		"AvatarBadge is decorative presence chrome — it does not determine authoritative online status or record lifecycle.",
		"Avatar does not replace StatusBadge for posting or approval state, or Badge for taxonomy such as Finance.",
	],
	approvedSizes: {
		default: {
			meaning:
				"Standard identity marker for ordinary directory and record rows.",
			allowedWhen: [
				"An operator or entity appears in a list row, comment trail, or compact header.",
			],
			prohibitedWhen: [
				"A profile summary needs stronger visual emphasis — prefer lg.",
			],
		},
		sm: {
			meaning:
				"Compact identity marker for dense metadata and overlapping groups.",
			allowedWhen: [
				"Dense tables, activity rows, or AvatarGroup stacks must stay recognizable without dominating the row.",
			],
			prohibitedWhen: [
				"The avatar is the primary identity signal on a profile or entity summary — prefer default or lg.",
			],
		},
		lg: {
			meaning: "Prominent identity marker for profile or entity summaries.",
			allowedWhen: [
				"A supplier contact, operator profile, or entity header gives identity visual emphasis.",
			],
			prohibitedWhen: [
				"Dense multi-column tables where large avatars crowd the row.",
			],
		},
	},
	rules: [
		"This contract governs Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, and AvatarGroupCount as one identity family.",
		"Compose AvatarImage with AvatarFallback so missing or failed photos still show stable initials.",
		"Provide stable meaningful initials or label fallback when the image is absent or fails.",
		"Keep AvatarFallback text contrast readable against the muted fill — prefer foreground text for ERP surfaces.",
		"Keep AvatarGroup ordering and overflow counts deterministic and explainable beyond overlapping images.",
		"Use StatusBadge separately when authoritative lifecycle or presence must be communicated.",
		"Use Badge for taxonomy such as department or module — not AvatarBadge.",
		"Pair every avatar with a visible name, entity label, or accessible group name in the surrounding composition.",
	],
	accessibility: [
		"Provide alternative text on AvatarImage when the image conveys identity; keep the same identity in nearby visible text.",
		"Hide decorative AvatarBadge chrome from assistive technologies when it adds no unique meaning.",
		"Ensure grouped identities remain understandable through visible names or an accessible group label beyond overlapping images.",
		"Do not rely on color alone for presence or identity meaning.",
	],
	prohibitedUsage: [
		"Do not use Avatar as proof of authentication or authorization.",
		"Do not expose private image URLs without feature-owned access policy.",
		"Do not encode posting, approval, or presence state only through AvatarBadge decoration.",
		"Do not omit a readable fallback when the image may fail to load.",
		"Do not use Avatar as a StatusBadge or taxonomy Badge substitute.",
	],
});
