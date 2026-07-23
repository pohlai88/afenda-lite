import type { AttendanceEvent, AttendanceSession } from "../../types";

export type ResolvedSessionMinutes = {
	firstClockInAt: Date | null;
	finalClockOutAt: Date | null;
	breakMinutes: number;
	workedMinutes: number;
	grossMinutes: number;
	resolutionStatus: AttendanceSession["resolutionStatus"];
	requiresReview: boolean;
};

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
				breakMinutes += Math.max(
					0,
					Math.round(
						(event.occurredAt.getTime() - openBreakAt.getTime()) / 60_000,
					),
				);
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
		resolutionStatus,
		requiresReview,
	};
}
