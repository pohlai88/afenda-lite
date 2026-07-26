import { createHash } from "node:crypto";

import { attendanceImportEventRowSchema } from "../../schemas/time";
import type {
	AttendanceSourceEvent,
	AttendanceSourcePreviewResult,
	AttendanceSourcePreviewRow,
	AttendanceSourceRejectedRow,
} from "../handoff/ports";
import {
	ATTENDANCE_IMPORT_ROW_BASIC_MESSAGES,
	assessAttendanceImportRowBasics,
} from "./import-row-validation";

function allocateSourceSequences(
	events: readonly AttendanceSourceEvent[],
): AttendanceSourceEvent[] {
	return events.map((event, index) => ({
		...event,
		sourceSequence: event.sourceSequence ?? index,
	}));
}

function rejectConnectorRow(input: {
	rowIndex: number;
	sourceReference: string;
	errorCode: AttendanceSourceRejectedRow["errorCode"];
}): {
	rejected: AttendanceSourceRejectedRow;
	preview: AttendanceSourcePreviewRow;
} {
	const errorMessage =
		input.errorCode === "INVALID_EVENT_ROW"
			? "Attendance source returned an invalid event row"
			: ATTENDANCE_IMPORT_ROW_BASIC_MESSAGES[input.errorCode];
	const rejected: AttendanceSourceRejectedRow = {
		rowIndex: input.rowIndex,
		sourceReference: input.sourceReference,
		errorCode: input.errorCode,
		errorMessage,
	};
	return {
		rejected,
		preview: {
			status: "rejected",
			rowIndex: input.rowIndex,
			sourceReference: input.sourceReference,
			errorCode: input.errorCode,
			errorMessage,
		},
	};
}

function partitionSourceEvents(events: readonly AttendanceSourceEvent[]): {
	accepted: AttendanceSourceEvent[];
	rejected: AttendanceSourceRejectedRow[];
	previewRows: AttendanceSourcePreviewRow[];
} {
	const accepted: AttendanceSourceEvent[] = [];
	const rejected: AttendanceSourceRejectedRow[] = [];
	const previewRows: AttendanceSourcePreviewRow[] = [];
	const seenReferences = new Set<string>();

	for (const [rowIndex, event] of events.entries()) {
		const basicIssue = assessAttendanceImportRowBasics({
			seenReferences,
			sourceReference: event.sourceReference,
			sourceTimezone: event.sourceTimezone,
		});
		if (basicIssue !== null) {
			const row = rejectConnectorRow({
				rowIndex,
				sourceReference: event.sourceReference,
				errorCode: basicIssue,
			});
			rejected.push(row.rejected);
			previewRows.push(row.preview);
			continue;
		}
		seenReferences.add(event.sourceReference);

		const parsed = attendanceImportEventRowSchema.safeParse(event);
		if (!parsed.success) {
			const row = rejectConnectorRow({
				rowIndex,
				sourceReference: event.sourceReference,
				errorCode: "INVALID_EVENT_ROW",
			});
			rejected.push(row.rejected);
			previewRows.push(row.preview);
			continue;
		}

		const acceptedEvent: AttendanceSourceEvent = {
			...event,
			...parsed.data,
		};
		accepted.push(acceptedEvent);
		previewRows.push({
			status: "accepted",
			rowIndex,
			sourceReference: acceptedEvent.sourceReference,
		});
	}

	return {
		accepted: allocateSourceSequences(accepted),
		rejected,
		previewRows,
	};
}

function buildReconciliationKey(input: {
	organizationId: string;
	cursor?: string;
	events: readonly AttendanceSourceEvent[];
}): string {
	return createHash("sha256")
		.update(
			JSON.stringify({
				organizationId: input.organizationId,
				cursor: input.cursor ?? null,
				rows: input.events.map((row) => ({
					sourceReference: row.sourceReference,
					employeeId: row.employeeId,
					eventType: row.eventType,
					occurredAt: row.occurredAt,
					sourceSequence: row.sourceSequence ?? null,
					payloadChecksum: row.payloadChecksum ?? null,
				})),
			}),
		)
		.digest("hex");
}

export type AttendanceConnectorArtifacts = {
	batch: {
		events: readonly AttendanceSourceEvent[];
		nextCursor?: string;
		rejectedRows: readonly AttendanceSourceRejectedRow[];
		reconciliationKey: string;
	};
	preview: AttendanceSourcePreviewResult;
};

export function buildAttendanceConnectorArtifacts(input: {
	organizationId: string;
	cursor?: string;
	events: readonly AttendanceSourceEvent[];
	nextCursor?: string;
}): AttendanceConnectorArtifacts {
	const partitioned = partitionSourceEvents(input.events);
	const reconciliationKey = buildReconciliationKey({
		organizationId: input.organizationId,
		cursor: input.cursor,
		events: partitioned.accepted,
	});

	return {
		batch: {
			events: partitioned.accepted,
			nextCursor: input.nextCursor,
			rejectedRows: partitioned.rejected,
			reconciliationKey,
		},
		preview: {
			mode: "preview",
			organizationId: input.organizationId,
			reconciliationKey,
			rows: partitioned.previewRows,
			totals: {
				accepted: partitioned.accepted.length,
				rejected: partitioned.rejected.length,
			},
			nextCursor: input.nextCursor,
		},
	};
}

export function normalizeAttendanceConnectorBatch(input: {
	organizationId: string;
	cursor?: string;
	events: readonly AttendanceSourceEvent[];
	nextCursor?: string;
}): AttendanceConnectorArtifacts["batch"] {
	return buildAttendanceConnectorArtifacts(input).batch;
}

export function buildAttendanceConnectorPreview(input: {
	organizationId: string;
	cursor?: string;
	events: readonly AttendanceSourceEvent[];
	nextCursor?: string;
}): AttendanceSourcePreviewResult {
	return buildAttendanceConnectorArtifacts(input).preview;
}
