import { defineManifestContract } from "./manifest.contract";

export const drawerContract = defineManifestContract({
	id: "ui.drawer.contract",
	component: "ui.drawer",
	purpose:
		"Provides a touch- and gesture-aware transient edge surface for compact ERP contextual review — posting batches, quick summaries, and short acknowledgements — without replacing Sheet for retained side tasks, Dialog for compact decisions, application navigation, authorization, or posting authority.",
	ownership: {
		componentOwns: [
			"Drawer portal, scrim, directional placement, drag interaction, focus containment, labelled content, and dismissal mechanics.",
		],
		consumerOwns: [
			"Content, direction suitability, authorization, whether Continue posts or advances review, workflow policy, validation, submission, dirty-state handling, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Gesture support does not make a workflow safe, secondary, or authorized — and never grants posting authority.",
		"Drawer is distinct from Sheet: Sheet remains the stable non-gesture side surface for task-focused contextual workflows.",
		"Drawer does not replace Dialog for compact modal decisions or AlertDialog for irreversible harm.",
		"StatusBadge owns balance or lifecycle meaning; Drawer owns only the transient review edge.",
	],
	rules: [
		"This contract governs Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose, DrawerOverlay, and DrawerPortal as one overlay family.",
		"Use Drawer for transient touch-friendly content where drag dismissal is appropriate.",
		"Provide one clear title, an accessible description when context requires it, and a predictable close path that is not gesture-only.",
		"Keep one primary continue or confirm action and an explicit Cancel, Close, or Acknowledge control.",
		"Use Sheet for retained-context side tasks and Dialog for compact decisions.",
		"Keep content compact — summaries and short review — not multi-step wizards or primary application navigation.",
		"Preserve originating context: trigger and Drawer title name the same posting batch, notice, or review subject.",
		"Keep title, summary, action hierarchy, focus, and keyboard dismissal coherent without relying on drag gestures.",
	],
	accessibility: [
		"Provide an accessible title and description for the dialog surface.",
		"Contain focus while open and restore focus to a meaningful trigger on close.",
		"Keep dismissal and all contained controls keyboard operable in addition to gesture input.",
		"Do not rely on drag gestures as the only way to leave the surface or to understand that the Drawer can close.",
	],
	prohibitedUsage: [
		"Do not use drag gestures as the only dismissal mechanism.",
		"Do not use Drawer as the primary application navigation or as a mechanical replacement for Sheet.",
		"Do not place authorization, persistence, or dirty-state policy inside the reusable primitive.",
		"Do not overload Drawer with long forms or multi-step workflows that belong on a page or Sheet.",
		"Do not use Drawer for irreversible confirmation — use AlertDialog.",
		"Do not stack transient Drawers as a hidden multi-step workflow.",
	],
});
