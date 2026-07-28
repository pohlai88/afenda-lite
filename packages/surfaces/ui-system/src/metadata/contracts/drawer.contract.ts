import { defineManifestContract } from "./manifest.contract";

export const drawerContract = defineManifestContract({
	id: "ui.drawer.contract",
	component: "ui.drawer",
	purpose:
		"Provides a touch- and gesture-aware transient edge surface for compact contextual content.",
	ownership: {
		componentOwns: [
			"Drawer portal, scrim, directional placement, drag interaction, focus containment, labelled content, and dismissal mechanics.",
		],
		consumerOwns: [
			"Content, direction suitability, authorization, workflow policy, validation, submission, dirty-state handling, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Gesture support does not make a workflow safe, secondary, or authorized.",
		"Drawer is distinct from Sheet: Sheet remains the stable non-gesture side surface for task-focused contextual workflows.",
	],
	rules: [
		"Use Drawer for transient touch-friendly content where drag dismissal is appropriate.",
		"Provide one clear title, an accessible description when context requires it, and a predictable close path.",
		"Use Sheet for retained-context side tasks and Dialog for compact decisions.",
	],
	accessibility: [
		"Provide an accessible title and description for the dialog surface.",
		"Contain focus while open and restore focus to a meaningful trigger on close.",
		"Keep dismissal and all contained controls keyboard operable in addition to gesture input.",
	],
	prohibitedUsage: [
		"Do not use drag gestures as the only dismissal mechanism.",
		"Do not use Drawer as the primary application navigation or as a mechanical replacement for Sheet.",
		"Do not place authorization, persistence, or dirty-state policy inside the reusable primitive.",
	],
});
