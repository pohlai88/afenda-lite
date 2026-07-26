import { createHash } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import { importAttendanceEventsInputSchema } from "../../schemas/time";
import { namespacedImportSourceReference } from "./import-keys";
import {
	ATTENDANCE_IMPORT_ROW_BASIC_MESSAGES,
	assessAttendanceImportRowBasics,
} from "./import-row-validation";

export type AttendanceImportDryRunRow =
	| {
			status: "accepted";
			rowIndex: number;
			sourceReference: string;
	  }
	| {
			status: "rejected";
			rowIndex: number;
			sourceReference: string;
			errorCode: "DUPLICATE_SOURCE_REFERENCE" | "INVALID_TIMEZONE";
			errorMessage: string;
	  };

export type AttendanceImportDryRunResult = {
	mode: "dry_run";
	organizationId: string;
	batchId: string;
	sourceKey: string;
	reconciliationKey: string;
	rows: readonly AttendanceImportDryRunRow[];
	totals: {
		accepted: number;
		rejected: number;
	};
};

export function dryRunAttendanceImport(
	input: unknown,
): Result<AttendanceImportDryRunResult> {
	const parsed = importAttendanceEventsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("VALIDATION_ERROR", "Invalid attendance import dry-run input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	if (parsed.data.events === undefined) {
		return fail(
			"VALIDATION_ERROR",
			"Attendance import dry-run requires explicit event rows",
		);
	}

	const seenReferences = new Set<string>();
	const rows: AttendanceImportDryRunRow[] = [];
	let accepted = 0;
	let rejected = 0;

	for (const [rowIndex, row] of parsed.data.events.entries()) {
		const sourceReference = namespacedImportSourceReference(
			parsed.data.sourceKey,
			row.sourceReference,
		);
		const basicIssue = assessAttendanceImportRowBasics({
			seenReferences,
			sourceReference,
			sourceTimezone: row.sourceTimezone,
		});
		if (basicIssue !== null) {
			rows.push({
				status: "rejected",
				rowIndex,
				sourceReference,
				errorCode: basicIssue,
				errorMessage: ATTENDANCE_IMPORT_ROW_BASIC_MESSAGES[basicIssue],
			});
			rejected += 1;
			continue;
		}
		seenReferences.add(sourceReference);

		rows.push({
			status: "accepted",
			rowIndex,
			sourceReference,
		});
		accepted += 1;
	}

	const reconciliationKey = createHash("sha256")
		.update(
			JSON.stringify({
				organizationId: parsed.data.organizationId,
				batchId: parsed.data.batchId,
				sourceKey: parsed.data.sourceKey,
				rows: parsed.data.events.map((row) => ({
					sourceReference: row.sourceReference,
					employeeId: row.employeeId,
					eventType: row.eventType,
					occurredAt: row.occurredAt,
					payloadChecksum: row.payloadChecksum ?? null,
				})),
			}),
		)
		.digest("hex");

	return ok({
		mode: "dry_run",
		organizationId: parsed.data.organizationId,
		batchId: parsed.data.batchId,
		sourceKey: parsed.data.sourceKey,
		reconciliationKey,
		rows,
		totals: { accepted, rejected },
	});
}
