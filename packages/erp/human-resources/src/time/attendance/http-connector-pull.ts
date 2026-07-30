import { fail, ok } from "@afenda/errors/result";
import { z } from "zod";

import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../error-codes";
import { attendanceImportEventRowSchema } from "../../schemas/time";
import type {
	AttendanceConnectorPullPort,
	AttendanceSourceEvent,
} from "../handoff/ports";

const HR_REGEX_1 = /\/+$/;

const attendanceConnectorHttpResponseSchema = z
	.object({
		events: z.array(attendanceImportEventRowSchema).optional(),
		nextCursor: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

function toAttendanceSourceEvent(
	event: z.infer<typeof attendanceImportEventRowSchema>,
): AttendanceSourceEvent {
	return {
		employeeId: event.employeeId,
		eventType: event.eventType,
		occurredAt: event.occurredAt,
		sourceTimezone: event.sourceTimezone,
		localWorkDate: event.localWorkDate,
		sourceReference: event.sourceReference,
		...(event.employmentId === undefined
			? {}
			: { employmentId: event.employmentId }),
		...(event.shiftAssignmentId === undefined
			? {}
			: { shiftAssignmentId: event.shiftAssignmentId }),
		...(event.locationKey === undefined
			? {}
			: { locationKey: event.locationKey }),
		...(event.deviceMetadata === undefined
			? {}
			: { deviceMetadata: event.deviceMetadata }),
		...(event.payloadChecksum === undefined
			? {}
			: { payloadChecksum: event.payloadChecksum }),
		...(event.notes === undefined ? {} : { notes: event.notes }),
		...(event.sourceSequence === undefined
			? {}
			: { sourceSequence: event.sourceSequence }),
	};
}

export function createHttpAttendanceConnectorPull(deps: {
	baseUrl: string;
	fetchImpl?: typeof fetch;
	sourceKey?: string;
}): AttendanceConnectorPullPort {
	const fetchImpl = deps.fetchImpl ?? fetch;
	const normalizedBaseUrl = deps.baseUrl.replace(HR_REGEX_1, "");

	return {
		async pull(input) {
			const url = new URL(`${normalizedBaseUrl}/events`);
			url.searchParams.set("organizationId", input.organizationId);
			if (input.cursor !== undefined) {
				url.searchParams.set("cursor", input.cursor);
			}
			if (deps.sourceKey !== undefined) {
				url.searchParams.set("sourceKey", deps.sourceKey);
			}

			let response: Response;
			try {
				response = await fetchImpl(url, {
					method: "GET",
					headers: { Accept: "application/json" },
				});
			} catch {
				return fail(
					"SERVICE_UNAVAILABLE",
					"Attendance connector request failed.",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
					),
				);
			}

			if (!response.ok) {
				const retryable = response.status >= 500 || response.status === 429;
				return fail(
					retryable ? "SERVICE_UNAVAILABLE" : "CONFLICT",
					"Attendance connector request was rejected.",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
					),
				);
			}

			let body: unknown;
			try {
				body = await response.json();
			} catch {
				return fail(
					"VALIDATION_ERROR",
					"Attendance connector returned invalid JSON.",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
					),
				);
			}

			const parsed = attendanceConnectorHttpResponseSchema.safeParse(body);
			if (!parsed.success) {
				return fail(
					"VALIDATION_ERROR",
					"Attendance connector returned an invalid payload.",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}

			const events: AttendanceSourceEvent[] = (parsed.data.events ?? []).map(
				toAttendanceSourceEvent,
			);

			return ok({
				events,
				...(parsed.data.nextCursor === undefined
					? {}
					: { nextCursor: parsed.data.nextCursor }),
			});
		},
	};
}
