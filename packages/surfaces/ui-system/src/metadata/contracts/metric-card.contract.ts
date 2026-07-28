import { defineManifestContract } from "./manifest.contract";

export const metricCardContract = defineManifestContract({
	id: "ui.metric-card.contract",
	component: "ui.metric-card",
	purpose:
		"Displays a scannable KPI value with optional comparison, trend, and supporting context.",
	ownership: {
		componentOwns: [
			"KPI presentation, approved directional treatments, comparison context, and consistent metric hierarchy.",
		],
		consumerOwns: [
			"Calculation logic, source integrity, comparison basis, business sentiment, thresholds, permissions, and freshness policy.",
		],
	},
	semanticBoundaries: [
		"Upward movement does not imply favorable business performance.",
		"Downward movement does not imply unfavorable business performance.",
		"Metric presentation does not establish the calculation as authoritative, current, or comparable.",
	],
	approvedVariants: {
		up: {
			meaning:
				"The metric increased relative to the declared comparison basis.",
			allowedWhen: [
				"The source calculation proves a positive numeric delta.",
				"The comparison period or baseline is explicitly known.",
			],
			prohibitedWhen: [
				"An increase is inferred from visual judgment rather than source data.",
				"The variant is being used to imply favorable performance.",
			],
		},
		down: {
			meaning:
				"The metric decreased relative to the declared comparison basis.",
			allowedWhen: [
				"The source calculation proves a negative numeric delta.",
				"The comparison period or baseline is explicitly known.",
			],
			prohibitedWhen: [
				"A decrease is inferred from incomplete or incomparable data.",
				"The variant is being used to imply unfavorable performance.",
			],
		},
		neutral: {
			meaning:
				"The metric is unchanged, has no directional comparison, or lacks a reliable comparison basis.",
			allowedWhen: [
				"The calculated delta is zero.",
				"No valid comparison period or baseline is available.",
				"The metric is intentionally presented without trend.",
			],
		},
	},
	rules: [
		"Metric values must come from a named and reproducible source calculation.",
		"Display the comparison period or baseline whenever a trend is shown.",
		"Use trend only for numeric values with a valid and comparable basis.",
		"Treat a numeric change value as a percentage; pass a preformatted string for currency, quantity, percentage-point, duration, or other non-percentage deltas.",
		"Treat directional movement separately from favorable or unfavorable business meaning.",
		"Until trend direction and business sentiment are independently configurable, use neutral when an increase is unfavorable or a decrease is favorable, and state the comparison in text.",
		"Use MetricGrid for repeated KPI groups with consistent hierarchy and spacing.",
		"Use consistent units, precision, and formatting for comparable metrics.",
		"Feature code owns calculation logic, thresholds, targets, permissions, and data freshness policy.",
		"Show stale, partial, estimated, or unavailable data explicitly when relevant.",
	],
	accessibility: [
		"Metric title, value, unit, and comparison meaning must remain understandable without the trend icon or color.",
		"Expose directional meaning in text rather than relying only on arrows.",
		"Use appropriate number and unit formatting that remains readable by assistive technologies.",
		"Loading state must preserve layout stability and must not announce repeated transient updates unnecessarily.",
		"Trend descriptions should identify the comparison basis, such as previous month or target.",
	],
	prohibitedUsage: [
		"Do not equate upward movement with positive performance or downward movement with negative performance.",
		"Do not use up or down when the component's directional color would communicate the wrong business sentiment.",
		"Do not use trend color as the sole indicator of meaning.",
		"Do not display a trend when the comparison periods, populations, currencies, or units are not comparable.",
		"Do not calculate authoritative KPI values inside MetricCard.",
		"Do not pass a numeric change for a non-percentage delta because MetricCard formats numeric changes with a percent sign.",
		"Do not place unrelated actions, filters, or form controls inside metric cards.",
		"Do not present decorative numbers as governed KPIs.",
		"Do not hide missing, stale, estimated, or incomplete data behind a neutral trend.",
	],
});
