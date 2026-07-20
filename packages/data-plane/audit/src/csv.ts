import type { AuditEntry } from "./types";

const CSV_HEADERS = [
	"id",
	"createdAt",
	"organizationId",
	"actorUserId",
	"correlationId",
	"module",
	"entity",
	"entityId",
	"action",
	"changesCount",
	"ipAddress",
	"userAgent",
] as const;

function escapeCsvField(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replaceAll('"', '""')}"`;
	}
	return value;
}

/** Org-scoped audit CSV (summary columns — not full changes JSON). */
export function auditEntriesToCsv(entries: AuditEntry[]): string {
	const lines = [
		CSV_HEADERS.join(","),
		...entries.map((entry) =>
			[
				entry.id,
				entry.createdAt.toISOString(),
				entry.organizationId,
				entry.actorUserId,
				entry.correlationId,
				entry.module,
				entry.entity,
				entry.entityId,
				entry.action,
				String(entry.changes.length),
				entry.ipAddress ?? "",
				entry.userAgent ?? "",
			]
				.map(escapeCsvField)
				.join(","),
		),
	];

	return lines.join("\n");
}
