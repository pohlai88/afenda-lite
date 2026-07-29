import { defineManifestContract } from "./manifest.contract";

export const toggleContract = defineManifestContract({
	id: "ui.toggle.contract",
	component: "ui.toggle",
	purpose:
		"Provides a pressable on-or-off control for a transient ERP view or formatting option — bold preview, pin filter, or density — without owning persistence or authorization.",
	ownership: {
		componentOwns: [
			"Toggle interaction, pressed-state semantics, approved visual variants, sizing, and focus presentation.",
		],
		consumerOwns: [
			"Option meaning, controlled state, persistence, authorization, and outcome handling.",
		],
	},
	semanticBoundaries: [
		"Pressed presentation does not prove that a domain change was saved.",
		"Outline treatment does not increase authority or consequence.",
		"Toggle is not Switch — persistent settings stay on Switch; commands stay on Button.",
	],
	approvedVariants: {
		default: {
			meaning: "Low-chrome toggle.",
			allowedWhen: [
				"The surrounding surface already provides sufficient control grouping.",
			],
			prohibitedWhen: [
				"The toggle needs a persistent control boundary for discoverability — use outline.",
			],
		},
		outline: {
			meaning: "Bounded toggle.",
			allowedWhen: [
				"The toggle needs a persistent control boundary for discoverability.",
			],
			prohibitedWhen: [
				"Peer choices already share a ToggleGroup outline surface — prefer group chrome.",
			],
		},
	},
	approvedSizes: {
		default: {
			meaning: "Standard toggle size.",
			allowedWhen: ["Ordinary toolbar or view controls are shown."],
		},
		sm: {
			meaning: "Compact toggle size.",
			allowedWhen: ["Dense toolbars remain readable and operable."],
			prohibitedWhen: [
				"A sparse surface needs a larger hit target — use default or lg.",
			],
		},
		lg: {
			meaning: "Large toggle size.",
			allowedWhen: [
				"A sparse surface requires a more prominent interaction target.",
			],
			prohibitedWhen: [
				"Dense toolbars already pack many peers — use sm or default.",
			],
		},
	},
	rules: [
		"Use Toggle for a reversible transient option with clear on and off meaning.",
		"Use Switch for persistent settings and Button for commands.",
		"Provide visible text or a clear accessible name for icon-only toggles.",
		"Keep pressed state feature-owned — do not treat chrome as save confirmation.",
	],
	accessibility: [
		"Preserve pressed, disabled, invalid, and visible-focus semantics.",
		"Expose an accessible name that remains meaningful in both states.",
		"Do not rely on background color alone to communicate pressed state.",
	],
	prohibitedUsage: [
		"Do not use Toggle for destructive or confirmation-requiring actions.",
		"Do not use pressed state as persistence confirmation.",
		"Do not use an unlabeled icon toggle.",
		"Do not encode lifecycle or approval in Toggle chrome — use StatusBadge on the record.",
	],
});
