import { fail, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../../command-options";
import { requireAttendanceSource } from "../../command-options";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../error-codes";
import { HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT } from "../../module-ids";
import {
	attendanceImportEventRowSchema,
	importAttendanceEventsInputSchema,
} from "../../schemas/time";
import { runTimeCommand } from "../../shared/time-command";
import type {
	AttendanceImportBatchInput,
	AttendanceImportEventRowInput,
	AttendanceImportResult,
} from "../../types";
import { namespacedImportSourceReference } from "./import-keys";

function mapSourceRows(
	sourceKey: string,
	rows: readonly {
		employeeId: AttendanceImportEventRowInput["employeeId"];
		employmentId?: AttendanceImportEventRowInput["employmentId"];
		shiftAssignmentId?: AttendanceImportEventRowInput["shiftAssignmentId"];
		eventType: AttendanceImportEventRowInput["eventType"];
		occurredAt: string;
		sourceTimezone: string;
		localWorkDate: string;
		sourceReference: string;
		locationKey?: string | null;
		deviceMetadata?: Record<string, unknown> | null;
		payloadChecksum?: string | null;
		notes?: string | null;
	}[],
): AttendanceImportEventRowInput[] {
	return rows.map((row) => ({
		employeeId: row.employeeId,
		employmentId: row.employmentId ?? null,
		shiftAssignmentId: row.shiftAssignmentId ?? null,
		eventType: row.eventType,
		occurredAt: new Date(row.occurredAt),
		sourceTimezone: row.sourceTimezone,
		localWorkDate: row.localWorkDate,
		sourceReference: namespacedImportSourceReference(
			sourceKey,
			row.sourceReference,
		),
		locationKey: row.locationKey ?? null,
		deviceMetadata: row.deviceMetadata ?? null,
		payloadChecksum: row.payloadChecksum ?? null,
		notes: row.notes ?? null,
	}));
}

export async function importAttendanceEvents(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceImportResult>> {
	return runTimeCommand(input, options, {
		schema: importAttendanceEventsInputSchema,
		invalidMessage: "Invalid attendance import input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT,
		execute: async (data, { store, ports }) => {
			let nextCursor: string | undefined;
			let rawEvents = data.events;

			if (rawEvents === undefined) {
				const source = requireAttendanceSource(options);
				if (!source.ok) return source;
				const fetched = await source.data.fetchEvents({
					organizationId: data.organizationId,
					cursor: data.cursor,
				});
				if (!fetched.ok) return fetched;
				const parsedRows = [];
				for (const event of fetched.data.events) {
					const parsed = attendanceImportEventRowSchema.safeParse(event);
					if (!parsed.success) {
						return fail(
							"VALIDATION_ERROR",
							"Attendance source returned invalid event rows",
							humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
						);
					}
					parsedRows.push(parsed.data);
				}
				if (parsedRows.length === 0) {
					return fail(
						"VALIDATION_ERROR",
						"Attendance source returned no events",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
					);
				}
				rawEvents = parsedRows;
				nextCursor = fetched.data.nextCursor;
			}

			const mapped = mapSourceRows(data.sourceKey, rawEvents);

			const storeInput: AttendanceImportBatchInput = {
				organizationId: data.organizationId,
				batchId: data.batchId,
				sourceKey: data.sourceKey,
				events: mapped,
				idempotencyKey: data.idempotencyKey,
				createRequestFingerprint: JSON.stringify({
					batchId: data.batchId,
					sourceKey: data.sourceKey,
					eventCount: mapped.length,
					sourceReferences: mapped.map((row) => row.sourceReference),
				}),
				createdBy: data.actorUserId,
				correlationId: data.correlationId,
				nextCursor,
			};

			return store.importAttendanceEvents(storeInput, ports);
		},
	});
}
