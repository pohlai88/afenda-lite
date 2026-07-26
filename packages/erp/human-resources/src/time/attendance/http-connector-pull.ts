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

const attendanceConnectorHttpResponseSchema = z
	.object({
		events: z.array(attendanceImportEventRowSchema).optional(),
		nextCursor: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

export function createHttpAttendanceConnectorPull(deps: {
	baseUrl: string;
	fetchImpl?: typeof fetch;
	sourceKey?: string;
}): AttendanceConnectorPullPort {
	const fetchImpl = deps.fetchImpl ?? fetch;
	const normalizedBaseUrl = deps.baseUrl.replace(/\/+$/, "");

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

			const events: AttendanceSourceEvent[] = parsed.data.events ?? [];

			return ok({
				events,
				nextCursor: parsed.data.nextCursor,
			});
		},
	};
}
