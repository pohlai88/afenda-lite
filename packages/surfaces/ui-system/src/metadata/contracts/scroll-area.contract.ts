import { defineManifestContract } from "./manifest.contract";

export const scrollAreaContract = defineManifestContract({
	id: "ui.scroll-area.contract",
	component: "ui.scroll-area",
	purpose:
		"Provides governed overflow scrolling with consistent visible scrollbars.",
	ownership: {
		componentOwns: [
			"Overflow viewport, scrollbar presentation, orientation, and pointer scrolling mechanics.",
		],
		consumerOwns: [
			"Viewport dimensions, content order, focus management, loading, and responsive suitability.",
		],
	},
	semanticBoundaries: [
		"Scrollable containment does not create a semantic region or reading boundary.",
		"Off-screen content does not become optional or unavailable.",
	],
	rules: [
		"Use ScrollArea only when a bounded viewport is required by the surrounding layout.",
		"Keep content order logical and avoid nested scrolling regions.",
		"Ensure focused descendants are scrolled into view.",
	],
	accessibility: [
		"Preserve native wheel, touch, keyboard, and assistive-technology scrolling.",
		"Label the region when its boundary has semantic meaning.",
		"Keep scrollbars and focused content perceivable at zoom.",
	],
	prohibitedUsage: [
		"Do not use ScrollArea to conceal page overflow defects.",
		"Do not trap keyboard focus within a scroll viewport.",
		"Do not create nested same-direction scroll areas without reviewed necessity.",
	],
});
