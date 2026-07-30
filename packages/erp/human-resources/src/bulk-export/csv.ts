import { createHash } from "node:crypto";

import type { HumanResourcesBulkExportArtifactChunk } from "../bulk-jobs/types";
import type { HumanResourcesBulkExportRow } from "./types";

const CSV_ESCAPE_PATTERN = /[",\r\n]/;
const CSV_HEADER_PATTERN = /^[^\r\n]*\r\n/;

function csvCell(value: unknown): string {
	const text = value === null || value === undefined ? "" : String(value);
	return CSV_ESCAPE_PATTERN.test(text)
		? `"${text.replaceAll('"', '""')}"`
		: text;
}

export function createHumanResourcesBulkExportCsv(
	fields: readonly string[],
	rows: readonly HumanResourcesBulkExportRow[],
): string {
	const header = ["recordId", ...fields].map(csvCell).join(",");
	const body = rows.map((row) =>
		[row.recordId, ...fields.map((field) => row.fields[field] ?? null)]
			.map(csvCell)
			.join(","),
	);
	return `${[header, ...body].join("\r\n")}\r\n`;
}

export function createHumanResourcesBulkExportArtifactChunk(input: {
	organizationId: string;
	jobId: string;
	fields: readonly string[];
	rows: readonly HumanResourcesBulkExportRow[];
	createdAt: Date;
}): HumanResourcesBulkExportArtifactChunk[] {
	const output: HumanResourcesBulkExportArtifactChunk[] = [];
	for (
		let offset = 0;
		offset < input.rows.length || (offset === 0 && input.rows.length === 0);
		offset += 200
	) {
		const page = input.rows.slice(offset, offset + 200);
		const contentWithHeader = createHumanResourcesBulkExportCsv(
			input.fields,
			page,
		);
		const content =
			offset === 0
				? contentWithHeader
				: contentWithHeader.replace(CSV_HEADER_PATTERN, "");
		output.push({
			organizationId: input.organizationId,
			jobId: input.jobId,
			chunkIndex: output.length,
			content,
			contentSha256: createHash("sha256").update(content).digest("hex"),
			byteCount: Buffer.byteLength(content),
			rowCount: page.length,
			createdAt: input.createdAt,
		});
	}
	return output;
}
