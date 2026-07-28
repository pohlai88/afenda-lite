import { defineManifestContract } from "./manifest.contract";

export const statusBadgeContract = defineManifestContract({
	id: "ui.status-badge.contract",
	component: "ui.status-badge",
	purpose:
		"Presents one authoritative lifecycle, approval, health, availability, or operational state with consistent text, icon, and status styling.",
	ownership: {
		componentOwns: [
			"Consistent status presentation, approved visual states, sizing, iconography, and accessible status semantics.",
		],
		consumerOwns: [
			"Authoritative state derivation, vocabulary, transition policy, permissions, persistence, and announcement coordination.",
		],
	},
	semanticBoundaries: [
		"Status styling does not derive or prove authoritative domain state.",
		"Visual severity does not determine workflow priority, remediation, or escalation policy.",
		"Status presentation does not determine whether a transition should be announced again.",
	],
	approvedVariants: {
		success: {
			meaning: "Confirmed successful, completed, valid, or healthy state.",
			allowedWhen: [
				"The owning domain confirms that the record, process, or service is successful, complete, valid, or healthy.",
			],
			prohibitedWhen: [
				"The state is merely expected, optimistic, or inferred from presentation data.",
			],
		},
		pending: {
			meaning: "Waiting, queued, or in-progress state.",
			allowedWhen: [
				"The owning workflow confirms that work is waiting, queued, or in progress and the final outcome is not yet known.",
			],
		},
		error: {
			meaning: "Confirmed failed, invalid, or blocked state.",
			allowedWhen: [
				"The owning domain confirms a failure, invalid result, or blocking condition that requires attention or resolution.",
			],
		},
		warning: {
			meaning: "Valid but attention-needed or at-risk state.",
			allowedWhen: [
				"The owning domain confirms that the state remains valid but has risk, incomplete requirements, or a condition requiring attention.",
			],
		},
		inactive: {
			meaning: "Dormant, disabled, or unavailable state.",
			allowedWhen: [
				"The owning domain confirms that the entity is intentionally dormant, disabled, paused, or unavailable.",
			],
		},
		active: {
			meaning: "Currently enabled or running state.",
			allowedWhen: [
				"The owning domain confirms that the entity is enabled, available, or operational.",
			],
		},
	},
	approvedSizes: {
		sm: {
			meaning: "Compact status.",
			allowedWhen: ["Table rows, metadata lines, and dense lists."],
		},
		md: {
			meaning: "Default status.",
			allowedWhen: ["Record headers, cards, and standard lists."],
		},
		lg: {
			meaning: "Prominent status.",
			allowedWhen: ["Entity headers or confirmation summaries."],
		},
	},
	rules: [
		"Use StatusBadge only for one authoritative state supplied by the owning domain or workflow.",
		"Set status explicitly for governed usage; do not rely on the component's inactive default to infer missing domain state.",
		"Feature code owns state derivation, transition policy, permissions, and persistence; StatusBadge owns presentation only.",
		"Use one short, explicit textual label from a stable domain vocabulary and avoid unexplained abbreviations.",
		"Map states consistently within the same domain; the same domain state must not use different variants across surfaces.",
		"Use size according to information hierarchy, not to imply greater severity or authority.",
		"Reserve warning for a still-valid attention state and error for a confirmed failure, invalid result, or blocking condition.",
		"Use Badge for categories, attributes, classifications, and non-authoritative metadata.",
	],
	accessibility: [
		"Provide concise textual content so the generated status accessible name is meaningful and stable.",
		"Status meaning must remain understandable without the icon, color, border, or background treatment.",
		"Do not repeatedly remount or update an unchanged StatusBadge, because its status role may trigger unnecessary announcements.",
		"When surrounding text already announces the same transition, avoid duplicate live-region messaging.",
		"Keep the status label understandable at every approved size and under text zoom.",
	],
	prohibitedUsage: [
		"Do not use StatusBadge for categories, attributes, freeform tags, counts, or decorative emphasis.",
		"Do not derive authoritative state from color, table selection, client-only presentation state, or incomplete data.",
		"Do not use success for an optimistic or merely expected outcome.",
		"Do not use warning and error interchangeably.",
		"Do not pass complex non-text content as the sole label when it would produce an unclear accessible name.",
		"Do not override status colors locally.",
		"Do not hide stale, unknown, or unavailable state behind active, inactive, or pending.",
	],
});
