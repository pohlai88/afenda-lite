import { defineManifestContract } from "./manifest.contract";

export const avatarContract = defineManifestContract({
	id: "ui.avatar.contract",
	component: "ui.avatar",
	purpose:
		"Presents a person or entity image, fallback identity, optional badge, and compact group composition.",
	ownership: {
		componentOwns: [
			"Avatar image framing, fallback presentation, grouped overlap, count display, and decorative badge placement.",
		],
		consumerOwns: [
			"Identity data, image source, fallback text, privacy, status meaning, and navigation behavior.",
		],
	},
	semanticBoundaries: [
		"An image or fallback does not establish authenticated identity.",
		"Avatar badge styling does not determine authoritative presence or lifecycle state.",
	],
	approvedSizes: {
		default: {
			meaning: "Standard identity marker.",
			allowedWhen: [
				"An avatar appears in ordinary record or navigation context.",
			],
		},
		sm: {
			meaning: "Compact identity marker.",
			allowedWhen: [
				"Dense metadata or grouped identities remain recognizable.",
			],
		},
		lg: {
			meaning: "Prominent identity marker.",
			allowedWhen: [
				"A profile or entity summary gives identity visual emphasis.",
			],
		},
	},
	rules: [
		"Use a stable meaningful fallback when the image is absent or fails.",
		"Keep group ordering and overflow counts deterministic.",
		"Use StatusBadge separately when authoritative state must be communicated.",
	],
	accessibility: [
		"Provide appropriate alternative text when the image conveys identity.",
		"Hide decorative images and badges from assistive technologies.",
		"Ensure grouped identities remain understandable beyond overlapping images.",
	],
	prohibitedUsage: [
		"Do not use Avatar as proof of authentication or authorization.",
		"Do not expose private image URLs without feature-owned policy.",
		"Do not encode status only through a small avatar decoration.",
	],
});
