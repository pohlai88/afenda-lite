import { errorResult } from "@afenda/errors";
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
				return errorResult.fail("SERVICE_UNAVAILABLE", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
					),
				});
			}

			if (!response.ok) {
				const retryable = response.status >= 500 || response.status === 429;
				const internalContext = humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
				);
				return retryable
					? errorResult.fail("SERVICE_UNAVAILABLE", { internalContext })
					: errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
							internalContext,
						});
			}

			let body: unknown;
			try {
				body = await response.json();
			} catch {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
					),
				});
			}

			const parsed = attendanceConnectorHttpResponseSchema.safeParse(body);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
			}

			const events: AttendanceSourceEvent[] = (parsed.data.events ?? []).map(
				toAttendanceSourceEvent,
			);

			return errorResult.ok({
				events,
				...(parsed.data.nextCursor === undefined
					? {}
					: { nextCursor: parsed.data.nextCursor }),
			});
		},
	};
}
