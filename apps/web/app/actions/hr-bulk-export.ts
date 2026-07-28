"use server";

import type { HumanResourcesBulkExportResult } from "@afenda/human-resources";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import {
	getHumanResourcesBulkExportDefinition,
	HUMAN_RESOURCES_BULK_EXPORT_TYPES,
} from "@/lib/erp/human-resources-bulk-export-registry";
import { runHumanResourcesBulkExportWorker } from "@/lib/erp/human-resources-bulk-export-worker";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const isoDateSchema = z.string().date();
const humanResourcesBulkExportActionSchema = z
	.object({
		exportType: z.enum(HUMAN_RESOURCES_BULK_EXPORT_TYPES),
		requestedFields: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
		dateFrom: isoDateSchema.optional(),
		dateTo: isoDateSchema.optional(),
		effectiveOn: isoDateSchema.optional(),
	})
	.strict();

export async function runHumanResourcesBulkExportAction(
	input: z.input<typeof humanResourcesBulkExportActionSchema>,
): Promise<ActionResult<{ export: HumanResourcesBulkExportResult }>> {
	const parsed = parseSchema(humanResourcesBulkExportActionSchema, input);
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid Human Resources export request.",
			parsed.details,
		);
	}
	const definition = getHumanResourcesBulkExportDefinition(
		parsed.data.exportType,
	);
	return runOperatorPermissionAction({
		path: "runHumanResourcesBulkExportAction",
		permission: definition.requiredPermission,
		safeMessage: "Could not export Human Resources data.",
		execute: async (session, correlationId) => {
			const result = await runHumanResourcesBulkExportWorker({
				...parsed.data,
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
			});
			const mapped = mapPackageResult(result);
			return mapped.ok ? { ok: true, data: { export: mapped.data } } : mapped;
		},
	});
}
