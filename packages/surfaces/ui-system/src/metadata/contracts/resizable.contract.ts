import { defineManifestContract } from "./manifest.contract";

export const resizableContract = defineManifestContract({
	id: "ui.resizable.contract",
	component: "ui.resizable",
	purpose:
		"Provides adjustable panel allocation within a bounded ERP workspace — master-detail, preview-evidence, or peer panes — not ordinary page spacing.",
	ownership: {
		componentOwns: [
			"Panel-group sizing interaction, drag handle presentation, keyboard resizing, and orientation semantics.",
		],
		consumerOwns: [
			"Panel content, minimum and maximum sizes, persistence, responsive fallback, and workspace policy.",
		],
	},
	semanticBoundaries: [
		"Panel size does not indicate importance, ownership, or selection.",
		"Persisted layout preference does not determine content authorization.",
		"Resizable does not replace MasterDetail for selection semantics between list and record.",
	],
	rules: [
		"Use Resizable for workspaces where users benefit from allocating space between peer panels.",
		"Declare usable minimum sizes for every panel.",
		"Provide a non-resizable responsive fallback when space is insufficient.",
		"Keep required controls reachable at every panel's minimum size.",
		"Use horizontal for list-detail peers and vertical for preview-over-notes stacks when that matches the task.",
	],
	accessibility: [
		"Expose separator orientation and current resize value semantics.",
		"Support keyboard resizing and visible focus on handles.",
		"Keep all panel content reachable at minimum sizes and zoom.",
		"Give each panel enough context that its purpose remains clear without relying on size alone.",
	],
	prohibitedUsage: [
		"Do not use Resizable for ordinary page spacing.",
		"Do not allow panels to collapse required controls into unusable layouts.",
		"Do not store business state in panel dimensions.",
		"Do not use Resizable as a substitute for responsive stacking on narrow viewports without a fallback.",
		"Do not treat a larger panel as higher authorization or priority.",
	],
});
