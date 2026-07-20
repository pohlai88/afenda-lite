/**
 * Ops usage-position bands — absolute cutpoints, not SKU / module limits.
 * WHY: org capacity signal without selling by module (saas DNA absorb).
 */

export const USAGE_METRIC_KEYS = [
	"activeMembers",
	"rbacAuditEvents",
	"activeRoleAssignments",
] as const;

export type UsageMetricKey = (typeof USAGE_METRIC_KEYS)[number];

export const USAGE_BANDS = ["quiet", "active", "heavy", "critical"] as const;

export type UsageBand = (typeof USAGE_BANDS)[number];

type BandThresholds = {
	/** Inclusive max for `quiet`. */
	readonly quietMax: number;
	/** Inclusive max for `active`. */
	readonly activeMax: number;
	/** Inclusive max for `heavy`; above → `critical`. */
	readonly heavyMax: number;
};

const BAND_THRESHOLDS = {
	activeMembers: { quietMax: 4, activeMax: 24, heavyMax: 99 },
	activeRoleAssignments: { quietMax: 4, activeMax: 19, heavyMax: 49 },
	rbacAuditEvents: { quietMax: 49, activeMax: 499, heavyMax: 4999 },
} as const satisfies Record<UsageMetricKey, BandThresholds>;

/**
 * Map a living counter to an ops band.
 */
export function bandFor(metric: UsageMetricKey, current: number): UsageBand {
	const thresholds = BAND_THRESHOLDS[metric];
	if (current <= thresholds.quietMax) {
		return "quiet";
	}
	if (current <= thresholds.activeMax) {
		return "active";
	}
	if (current <= thresholds.heavyMax) {
		return "heavy";
	}
	return "critical";
}
