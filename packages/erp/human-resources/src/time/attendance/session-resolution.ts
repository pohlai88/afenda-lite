import type {
	AttendanceEvent,
	AttendanceSession,
	AttendanceSessionResolveInput,
} from "../../types";

export type AttendanceBreakInterval = {
	startedAt: Date;
	endedAt: Date;
};

export type ResolvedSessionMinutes = {
	firstClockInAt: Date | null;
	finalClockOutAt: Date | null;
	breakMinutes: number;
	workedMinutes: number;
	grossMinutes: number;
	breakIntervals: readonly AttendanceBreakInterval[];
	resolutionStatus: AttendanceSession["resolutionStatus"];
	requiresReview: boolean;
};

function serializeBreakIntervals(
	intervals: readonly AttendanceBreakInterval[],
): NonNullable<AttendanceSession["provenance"]["breakIntervals"]> {
	return intervals.map((interval) => ({
		startedAt: interval.startedAt.toISOString(),
		endedAt: interval.endedAt.toISOString(),
	}));
}

export function applyAutomaticBreakPolicy(
	resolved: ResolvedSessionMinutes,
	input: AttendanceSessionResolveInput["automaticBreakPolicy"],
): Pick<
	AttendanceSession,
	"breakMinutes" | "workedMinutes" | "grossMinutes" | "provenance"
> {
	const breakIntervals = serializeBreakIntervals(resolved.breakIntervals);
	if (input === null || resolved.grossMinutes < input.afterMinutes) {
		return {
			breakMinutes: resolved.breakMinutes,
			workedMinutes: resolved.workedMinutes,
			grossMinutes: resolved.grossMinutes,
			provenance: {
				automaticBreak: null,
				breakIntervals,
			},
		};
	}
	const applied = resolved.breakMinutes < input.deductionMinutes;
	const breakMinutes = applied ? input.deductionMinutes : resolved.breakMinutes;
	return {
		breakMinutes,
		workedMinutes: Math.max(0, resolved.grossMinutes - breakMinutes),
		grossMinutes: resolved.grossMinutes,
		provenance: {
			automaticBreak: {
				policyId: input.policyId,
				minutes: input.deductionMinutes,
				applied,
			},
			breakIntervals,
		},
	};
}

/**
 * Pair clock/break events into session minutes for a local work date.
 * Events must already be filtered to one employee + localWorkDate and sorted ascending.
 */
export function resolveSessionFromEvents(
	events: readonly AttendanceEvent[],
): ResolvedSessionMinutes {
	const active = events.filter((event) => event.voidedAt === null);
	let firstClockInAt: Date | null = null;
	let finalClockOutAt: Date | null = null;
	let breakMinutes = 0;
	let openBreakAt: Date | null = null;
	let missingPair = false;
	const breakIntervals: AttendanceBreakInterval[] = [];

	for (const event of active) {
		switch (event.eventType) {
			case "clock_in": {
				if (firstClockInAt === null) {
					firstClockInAt = event.occurredAt;
				}
				break;
			}
			case "clock_out": {
				finalClockOutAt = event.occurredAt;
				break;
			}
			case "break_start": {
				if (openBreakAt !== null) {
					missingPair = true;
				}
				openBreakAt = event.occurredAt;
				break;
			}
			case "break_end": {
				if (openBreakAt === null) {
					missingPair = true;
					break;
				}
				const intervalMinutes = Math.max(
					0,
					Math.round(
						(event.occurredAt.getTime() - openBreakAt.getTime()) / 60_000,
					),
				);
				breakMinutes += intervalMinutes;
				if (intervalMinutes > 0) {
					breakIntervals.push({
						startedAt: openBreakAt,
						endedAt: event.occurredAt,
					});
				}
				openBreakAt = null;
				break;
			}
			case "manual_adjustment":
				break;
			default: {
				const _exhaustive: never = event.eventType;
				void _exhaustive;
			}
		}
	}

	if (openBreakAt !== null) {
		missingPair = true;
	}

	const grossMinutes =
		firstClockInAt !== null && finalClockOutAt !== null
			? Math.max(
					0,
					Math.round(
						(finalClockOutAt.getTime() - firstClockInAt.getTime()) / 60_000,
					),
				)
			: 0;
	const workedMinutes = Math.max(0, grossMinutes - breakMinutes);

	let resolutionStatus: AttendanceSession["resolutionStatus"] = "incomplete";
	let requiresReview = missingPair;

	if (firstClockInAt !== null && finalClockOutAt !== null) {
		resolutionStatus = missingPair ? "needs_review" : "resolved";
		requiresReview = missingPair;
	} else if (firstClockInAt !== null || finalClockOutAt !== null) {
		resolutionStatus = "needs_review";
		requiresReview = true;
	}

	return {
		firstClockInAt,
		finalClockOutAt,
		breakMinutes,
		workedMinutes,
		grossMinutes,
		breakIntervals,
		resolutionStatus,
		requiresReview,
	};
}

export function parseStoredBreakIntervals(
	stored: AttendanceSession["provenance"]["breakIntervals"],
): AttendanceBreakInterval[] {
	if (stored === undefined) {
		return [];
	}
	const intervals: AttendanceBreakInterval[] = [];
	for (const interval of stored) {
		const startedAt = new Date(interval.startedAt);
		const endedAt = new Date(interval.endedAt);
		if (
			Number.isNaN(startedAt.getTime()) ||
			Number.isNaN(endedAt.getTime()) ||
			endedAt <= startedAt
		) {
			continue;
		}
		intervals.push({ startedAt, endedAt });
	}
	return intervals;
}
