import { defineManifestContract } from "./manifest.contract";

export const chartContract = defineManifestContract({
	id: "ui.chart.contract",
	component: "ui.chart",
	purpose:
		"Frames responsive ERP analytics — series configuration, tooltip, legend, and supporting presentation — so operators can compare named metrics without treating geometry as causation or completeness.",
	ownership: {
		componentOwns: [
			"Chart container sizing, series token mapping, tooltip and legend composition, and responsive visual framing.",
		],
		consumerOwns: [
			"Dataset, metric definition, aggregation, scale, units, comparison basis, permissions, currency, period selection, and analytical interpretation.",
		],
	},
	semanticBoundaries: [
		"Visual trend does not establish causation, statistical significance, or favorable business meaning.",
		"Chart color and geometry do not make data complete, current, authorized, or comparable across mismatched periods or currencies.",
		"Chart does not replace MetricCard for a single KPI, StatusBadge for lifecycle, or Table for exact audit values.",
	],
	rules: [
		"This contract governs ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, and ChartStyle as one analytics framing family.",
		"Use named reproducible metrics with explicit units and a stated comparison basis.",
		"Choose chart forms that match the analytical relationship — comparison, composition, or distribution — rather than decoration.",
		"Provide a tabular or textual equivalent when exact values matter for posting, collection, or audit decisions.",
		"Map series keys in ChartConfig to stable labels and token colours so legend and tooltip stay consistent.",
		"Keep Charts inside a named analytical surface; feature code owns filters, period, and permission to view the series.",
	],
	accessibility: [
		"Provide a concise chart title, description, and a non-visual data alternative such as a table or summary text.",
		"Do not rely on colour alone to distinguish series or states — pair colour with legend labels and readable values.",
		"Ensure tooltip information remains available through keyboard-focusable chart interaction or the textual alternative.",
		"Use Recharts accessibilityLayer when composing bar or line charts so the plot participates in assistive technology.",
	],
	prohibitedUsage: [
		"Do not calculate authoritative metrics inside chart components.",
		"Do not compare incompatible periods, currencies, units, or populations.",
		"Do not use charts for decorative numbers without an analytical question.",
		"Do not present a chart as proof of causation or as a substitute for StatusBadge lifecycle.",
		"Do not omit units, currency, or period from the surrounding title or description.",
	],
});
