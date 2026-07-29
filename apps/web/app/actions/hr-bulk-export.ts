"use server";

import {
	enqueueHumanResourcesBulkExport,
	type HumanResourcesBulkExportJob,
	recordHrPrivacyOperation,
} from "@afenda/human-resources";
import { createDrizzleHumanResourcesBulkJobStore } from "@afenda/human-resources/adapters/drizzle";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrBulkOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import {
	getHumanResourcesBulkExportDefinition,
	HUMAN_RESOURCES_BULK_EXPORT_TYPES,
} from "@/lib/erp/human-resources-bulk-export-registry";
import {
	classifyHrFailure,
	createProductionHrObservabilityPorts,
} from "@/modules/platform/observability/human-resources-observability";
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
		idempotencyKey: z.string().trim().min(1).max(200),
		dateFrom: isoDateSchema.optional(),
		dateTo: isoDateSchema.optional(),
		effectiveOn: isoDateSchema.optional(),
	})
	.strict();

export async function runHumanResourcesBulkExportAction(
	input: z.input<typeof humanResourcesBulkExportActionSchema>,
): Promise<ActionResult<{ job: HumanResourcesBulkExportJob }>> {
	const parsed = parseSchema(humanResourcesBulkExportActionSchema, input);
	if (!parsed.success) {
		await recordHrPrivacyOperation(
			{ operation: "export", outcome: "failure", failureReason: "validation" },
			createProductionHrObservabilityPorts(),
		);
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
			const result = await enqueueHumanResourcesBulkExport(
				{
					exportType: parsed.data.exportType,
					requestedFields: parsed.data.requestedFields,
					idempotencyKey: parsed.data.idempotencyKey,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					requiredPermission: definition.requiredPermission,
					...(parsed.data.dateFrom === undefined
						? {}
						: { dateFrom: parsed.data.dateFrom }),
					...(parsed.data.dateTo === undefined
						? {}
						: { dateTo: parsed.data.dateTo }),
					...(parsed.data.effectiveOn === undefined
						? {}
						: { effectiveOn: parsed.data.effectiveOn }),
				},
				createDrizzleHumanResourcesBulkJobStore(),
			);
			await recordHrPrivacyOperation(
				result.ok
					? { operation: "export", outcome: "success" }
					: {
							operation: "export",
							outcome: "failure",
							failureReason: classifyHrFailure(result.code),
						},
				createProductionHrObservabilityPorts(),
			);
			const mapped = mapPackageResult(result);
			return mapped.ok ? { ok: true, data: { job: mapped.data } } : mapped;
		},
	});
}
