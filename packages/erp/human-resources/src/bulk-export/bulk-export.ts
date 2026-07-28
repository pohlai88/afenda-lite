import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";
import type {
	HumanResourcesBulkExportDefinition,
	HumanResourcesBulkExportPorts,
	HumanResourcesBulkExportRequest,
	HumanResourcesBulkExportResult,
	HumanResourcesBulkExportSource,
	HumanResourcesExportSourceRecord,
} from "./types";

const isoDateSchema = z.string().date();

function validateRequest(
	request: HumanResourcesBulkExportRequest,
	definition: HumanResourcesBulkExportDefinition,
): Result<HumanResourcesBulkExportRequest> {
	if (request.exportType !== definition.exportType) {
		return fail(
			"VALIDATION_ERROR",
			"Export type does not match its definition",
		);
	}
	if (request.requiredPermission !== definition.requiredPermission) {
		return fail("FORBIDDEN", "Export permission does not match its definition");
	}
	if (request.requestedFields.length === 0) {
		return fail("VALIDATION_ERROR", "Select at least one export field");
	}
	if (
		new Set(request.requestedFields).size !== request.requestedFields.length
	) {
		return fail("VALIDATION_ERROR", "Export fields must be unique");
	}
	const allowed = new Set(definition.allowedFields);
	if (request.requestedFields.some((field) => !allowed.has(field))) {
		return fail("FORBIDDEN", "Export contains a field outside its projection");
	}
	for (const date of [request.dateFrom, request.dateTo, request.effectiveOn]) {
		if (date !== undefined && !isoDateSchema.safeParse(date).success) {
			return fail("VALIDATION_ERROR", "Export dates must use YYYY-MM-DD");
		}
	}
	if (
		request.dateFrom !== undefined &&
		request.dateTo !== undefined &&
		request.dateFrom > request.dateTo
	) {
		return fail("VALIDATION_ERROR", "Export date range is reversed");
	}
	return ok(request);
}

function recordMatchesFilters(
	record: HumanResourcesExportSourceRecord,
	request: HumanResourcesBulkExportRequest,
): boolean {
	if (request.dateFrom !== undefined && record.occurredOn < request.dateFrom) {
		return false;
	}
	if (request.dateTo !== undefined && record.occurredOn > request.dateTo) {
		return false;
	}
	if (request.effectiveOn === undefined) return true;
	return (
		(record.effectiveFrom === null ||
			record.effectiveFrom <= request.effectiveOn) &&
		(record.effectiveTo === null || record.effectiveTo >= request.effectiveOn)
	);
}

export async function runHumanResourcesBulkExport(
	request: HumanResourcesBulkExportRequest,
	definition: HumanResourcesBulkExportDefinition,
	source: HumanResourcesBulkExportSource,
	ports: HumanResourcesBulkExportPorts,
): Promise<Result<HumanResourcesBulkExportResult>> {
	const validated = validateRequest(request, definition);
	if (!validated.ok) return validated;

	const authorized = await ports.authorize({
		organizationId: request.organizationId,
		actorUserId: request.actorUserId,
		permission: request.requiredPermission,
	});
	if (!authorized) {
		return fail("FORBIDDEN", "You do not have permission to export this data");
	}

	const listed = await source.list({
		organizationId: request.organizationId,
		dateFrom: request.dateFrom,
		dateTo: request.dateTo,
		effectiveOn: request.effectiveOn,
	});
	if (!listed.ok) return listed;
	if (
		listed.data.some(
			(record) => record.organizationId !== request.organizationId,
		)
	) {
		return fail(
			"INTERNAL_ERROR",
			"Bulk export source crossed a tenant boundary",
		);
	}

	const records = listed.data.filter((record) =>
		recordMatchesFilters(record, request),
	);
	if (records.length > definition.maximumRows) {
		return fail(
			"VALIDATION_ERROR",
			"Bulk export exceeds the configured row limit",
		);
	}

	const rows = records.map((record) => ({
		recordId: record.recordId,
		fields: Object.fromEntries(
			request.requestedFields.map((field) => [
				field,
				record.fields[field] ?? null,
			]),
		),
	}));
	const evidence = await ports.recordPrivacyEvidence({
		organizationId: request.organizationId,
		actorUserId: request.actorUserId,
		correlationId: request.correlationId,
		exportType: request.exportType,
		fields: request.requestedFields,
		rowCount: rows.length,
		dateFrom: request.dateFrom ?? null,
		dateTo: request.dateTo ?? null,
		effectiveOn: request.effectiveOn ?? null,
	});
	if (!evidence.ok) return evidence;

	return ok({
		organizationId: request.organizationId,
		exportType: request.exportType,
		fields: request.requestedFields,
		rows,
		privacyEvidenceId: evidence.data.evidenceId,
	});
}
