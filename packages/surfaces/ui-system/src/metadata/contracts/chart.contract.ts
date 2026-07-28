import { defineManifestContract } from "./manifest.contract";

export const chartContract = defineManifestContract({
	id: "ui.chart.contract",
	component: "ui.chart",
	purpose:
		"Provides responsive chart framing, semantic series configuration, tooltip, legend, and accessible supporting presentation.",
	ownership: {
		componentOwns: [
			"Chart container sizing, series token mapping, tooltip and legend composition, and responsive visual framing.",
		],
		consumerOwns: [
			"Dataset, metric definition, aggregation, scale, units, comparison validity, permissions, and analytical interpretation.",
		],
	},
	semanticBoundaries: [
		"Visual trend does not establish causation, significance, or favorable business meaning.",
		"Chart color and geometry do not make data complete, current, or comparable.",
	],
	rules: [
		"Use named reproducible metrics with explicit units and comparison basis.",
		"Choose chart forms that match the analytical relationship rather than decoration.",
		"Provide a tabular or textual equivalent when exact values matter.",
	],
	accessibility: [
		"Provide a concise chart title, description, and non-visual data alternative.",
		"Do not rely on color alone to distinguish series or states.",
		"Ensure tooltip information is available without pointer-only interaction.",
	],
	prohibitedUsage: [
		"Do not calculate authoritative metrics inside chart components.",
		"Do not compare incompatible periods, currencies, units, or populations.",
		"Do not use charts for decorative numbers without an analytical question.",
	],
});
