import { errorResult, type Result } from "@afenda/errors";
import type {
	AttendanceImportEventRowInput,
	AttendanceImportResult,
} from "../../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import { requireAttendanceSource } from "../../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../../kernel/execution/error-codes";
import { HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT } from "../../../kernel/operations/module-ids";
import type { AttendanceSourceRejectedRow } from "../handoff/ports";
import { runTimeCapabilityCommand } from "../run-operation";
import {
	attendanceImportEventRowSchema,
	importAttendanceEventsInputSchema,
} from "../schema";
import type { AttendanceImportStoreInput } from "../store-contract";
import { namespacedImportSourceReference } from "./import-keys";

function resolveSourceRowIndexes(input: {
	acceptedCount: number;
	rejectedRows: readonly AttendanceSourceRejectedRow[];
}): number[] {
	const rejectedIndexes = new Set(
		input.rejectedRows.map((row) => row.rowIndex),
	);
	const totalRows = input.acceptedCount + input.rejectedRows.length;
	const acceptedIndexes: number[] = [];
	for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
		if (!rejectedIndexes.has(rowIndex)) {
			acceptedIndexes.push(rowIndex);
		}
	}
	return acceptedIndexes;
}

function mapSourceRows(
	sourceKey: string,
	rows: readonly {
		employeeId: AttendanceImportEventRowInput["employeeId"];
		employmentId?: AttendanceImportEventRowInput["employmentId"] | undefined;
		shiftAssignmentId?:
			| AttendanceImportEventRowInput["shiftAssignmentId"]
			| undefined;
		eventType: AttendanceImportEventRowInput["eventType"];
		occurredAt: string;
		sourceTimezone: string;
		localWorkDate: string;
		sourceReference: string;
		locationKey?: string | null | undefined;
		deviceMetadata?: Record<string, unknown> | null | undefined;
		payloadChecksum?: string | null | undefined;
		notes?: string | null | undefined;
		sourceSequence?: number | undefined;
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
		...(row.sourceSequence === undefined
			? {}
			: { sourceSequence: row.sourceSequence }),
	}));
}

export async function importAttendanceEvents(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceImportResult>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: importAttendanceEventsInputSchema,
		invalidMessage: "Invalid attendance import input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT,
		storeMethods: ["importAttendanceEvents"],
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The domain workflow keeps ordered invariant validation and Result mapping explicit.
		execute: async (data, { store, ports }) => {
			let nextCursor: string | undefined;
			let rawEvents = data.events;
			let sourceRejectedRows:
				| readonly AttendanceSourceRejectedRow[]
				| undefined;
			let sourceRowIndexes: readonly number[] | undefined;

			if (rawEvents === undefined) {
				const source = requireAttendanceSource(options);
				if (!source.ok) {
					return source;
				}
				const fetched = await source.data.fetchEvents({
					organizationId: data.organizationId,
					...(data.cursor === undefined ? {} : { cursor: data.cursor }),
				});
				if (!fetched.ok) {
					return fetched;
				}
				sourceRejectedRows = fetched.data.rejectedRows;
				const parsedRows: ReturnType<
					typeof attendanceImportEventRowSchema.parse
				>[] = [];
				for (const event of fetched.data.events) {
					const parsed = attendanceImportEventRowSchema.safeParse(event);
					if (!parsed.success) {
						return errorResult.fail("VALIDATION_ERROR", {
							publicMessage: "The submitted data is invalid",
							internalContext: humanResourcesErrorDetails(
								HUMAN_RESOURCES_ERROR_INVALID_INPUT,
							),
						});
					}
					parsedRows.push(parsed.data);
				}
				if (
					parsedRows.length === 0 &&
					(sourceRejectedRows === undefined || sourceRejectedRows.length === 0)
				) {
					return errorResult.fail("VALIDATION_ERROR", {
						publicMessage: "The submitted data is invalid",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_INVALID_INPUT,
						),
					});
				}
				rawEvents = parsedRows;
				({ nextCursor } = fetched.data);
				if (sourceRejectedRows !== undefined) {
					sourceRowIndexes = resolveSourceRowIndexes({
						acceptedCount: parsedRows.length,
						rejectedRows: sourceRejectedRows,
					});
				}
			}

			const mapped = mapSourceRows(data.sourceKey, rawEvents);

			const storeInput: AttendanceImportStoreInput = {
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
					sourceRejectedRows: sourceRejectedRows ?? [],
					sourceRowIndexes: sourceRowIndexes ?? [],
				}),
				createdBy: data.actorUserId,
				correlationId: data.correlationId,
				...(nextCursor === undefined ? {} : { nextCursor }),
				...(sourceRejectedRows === undefined ? {} : { sourceRejectedRows }),
				...(sourceRowIndexes === undefined ? {} : { sourceRowIndexes }),
			};

			return store.importAttendanceEvents(storeInput, ports);
		},
	});
}
