import { errorResult, type Result } from "@afenda/errors";
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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	if (request.requiredPermission !== definition.requiredPermission) {
		return errorResult.fail("FORBIDDEN");
	}
	if (request.requestedFields.length === 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	if (
		new Set(request.requestedFields).size !== request.requestedFields.length
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	const allowed = new Set(definition.allowedFields);
	if (request.requestedFields.some((field) => !allowed.has(field))) {
		return errorResult.fail("FORBIDDEN");
	}
	for (const date of [request.dateFrom, request.dateTo, request.effectiveOn]) {
		if (date !== undefined && !isoDateSchema.safeParse(date).success) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
			});
		}
	}
	if (
		request.dateFrom !== undefined &&
		request.dateTo !== undefined &&
		request.dateFrom > request.dateTo
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	return errorResult.ok(request);
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
	if (request.effectiveOn === undefined) {
		return true;
	}
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
	if (!validated.ok) {
		return validated;
	}

	const authorized = await ports.authorize({
		organizationId: request.organizationId,
		actorUserId: request.actorUserId,
		permission: request.requiredPermission,
	});
	if (!authorized) {
		return errorResult.fail("FORBIDDEN");
	}

	const listed = await source.list({
		organizationId: request.organizationId,
		...(request.dateFrom === undefined ? {} : { dateFrom: request.dateFrom }),
		...(request.dateTo === undefined ? {} : { dateTo: request.dateTo }),
		...(request.effectiveOn === undefined
			? {}
			: { effectiveOn: request.effectiveOn }),
	});
	if (!listed.ok) {
		return listed;
	}
	if (
		listed.data.some(
			(record) => record.organizationId !== request.organizationId,
		)
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}

	const records = listed.data.filter((record) =>
		recordMatchesFilters(record, request),
	);
	if (records.length > definition.maximumRows) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
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
	if (!evidence.ok) {
		return evidence;
	}

	return errorResult.ok({
		organizationId: request.organizationId,
		exportType: request.exportType,
		fields: request.requestedFields,
		rows,
		privacyEvidenceId: evidence.data.evidenceId,
	});
}
