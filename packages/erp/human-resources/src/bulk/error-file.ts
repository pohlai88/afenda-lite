import type { BulkRowOutcome } from "./types";

function csvCell(value: string): string {
	return `"${value.replaceAll('"', '""')}"`;
}

export function renderBulkErrorFile(
	rows: readonly BulkRowOutcome[],
): string | null {
	const errors = rows.flatMap((row) =>
		row.status === "accepted"
			? []
			: row.issues.map((issue) => ({ row, issue })),
	);
	if (errors.length === 0) return null;
	return [
		"row_index,source_reference,error_code,error_message,field,disposition",
		...errors.map(({ row, issue }) =>
			[
				String(row.rowIndex),
				csvCell(row.sourceReference),
				csvCell(issue.code),
				csvCell(issue.message),
				csvCell(issue.field ?? ""),
				issue.disposition,
			].join(","),
		),
	].join("\n");
}
