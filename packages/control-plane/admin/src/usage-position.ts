import {
	type OrganizationUsageMetrics,
	organizationUsageMetricsSchema,
	type UsageAlert,
	type UsageMetricCell,
} from "./schemas/usage";
import { bandFor, USAGE_METRIC_KEYS, type UsageMetricKey } from "./usage-bands";

export type UsagePositionCounts = Record<UsageMetricKey, number>;

function alertLevelForBand(
	band: UsageMetricCell["band"],
): UsageAlert["level"] | null {
	switch (band) {
		case "heavy":
			return "warning";
		case "critical":
			return "critical";
		case "quiet":
		case "active":
			return null;
		default: {
			const _exhaustive: never = band;
			throw new Error(`Unexpected usage band: ${String(_exhaustive)}`);
		}
	}
}

function cellFor(metric: UsageMetricKey, current: number): UsageMetricCell {
	return {
		current,
		band: bandFor(metric, current),
	};
}

/**
 * Pure usage-position matrix from living counts (no I/O).
 * WHY: unit-test bands/alerts without Auth/DB; fetch stays in `usage.ts`.
 */
export function buildUsagePosition(input: {
	orgId: string;
	period: string;
	counts: UsagePositionCounts;
}): OrganizationUsageMetrics {
	const metrics = {} as Record<UsageMetricKey, UsageMetricCell>;
	const alerts: UsageAlert[] = [];

	for (const metric of USAGE_METRIC_KEYS) {
		const cell = cellFor(metric, input.counts[metric]);
		metrics[metric] = cell;
		const level = alertLevelForBand(cell.band);
		if (level !== null) {
			alerts.push({ metric, level });
		}
	}

	return organizationUsageMetricsSchema.parse({
		orgId: input.orgId,
		period: input.period,
		metrics,
		alerts,
	});
}
