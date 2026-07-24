import { createHash } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import { importAttendanceEventsInputSchema } from "../../schemas/time";
import { isValidIanaTimeZone } from "../iana-timezone";
import { namespacedImportSourceReference } from "./import-keys";

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
	for (const [rowIndex, row] of parsed.data.events.entries()) {
		const sourceReference = namespacedImportSourceReference(
			parsed.data.sourceKey,
			row.sourceReference,
		);
		if (seenReferences.has(sourceReference)) {
			rows.push({
				status: "rejected",
				rowIndex,
				sourceReference,
				errorCode: "DUPLICATE_SOURCE_REFERENCE",
				errorMessage: "Source reference is duplicated in this batch",
			});
			continue;
		}
		seenReferences.add(sourceReference);

		if (!isValidIanaTimeZone(row.sourceTimezone)) {
			rows.push({
				status: "rejected",
				rowIndex,
				sourceReference,
				errorCode: "INVALID_TIMEZONE",
				errorMessage: "Source timezone is not a valid IANA timezone",
			});
			continue;
		}

		rows.push({
			status: "accepted",
			rowIndex,
			sourceReference,
		});
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
		totals: {
			accepted: rows.filter((row) => row.status === "accepted").length,
			rejected: rows.filter((row) => row.status === "rejected").length,
		},
	});
}
