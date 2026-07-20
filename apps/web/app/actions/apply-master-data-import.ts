"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	type ImportReconciliationReport,
	PARTY_KINDS,
	upsertPartiesByCode,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ApplyMasterDataImportActionData = ImportReconciliationReport;

const partyRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	partyKind: z.enum(PARTY_KINDS),
	expectedVersion: z.number().int().positive().optional(),
});

const applyImportSchema = z.object({
	sourceSystem: z.string().trim().min(1).max(64),
	entity: z.literal("party"),
	rows: z.array(partyRowSchema).min(1).max(100),
});

/**
 * Apply bounded party upsert-by-code — `master_data.import_approve`.
 * Stamps package `approved: true` after the permission gate (never trust client).
 */
export async function applyMasterDataImportAction(
	input: unknown,
): Promise<ActionResult<ApplyMasterDataImportActionData>> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(applyImportSchema, input);
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Provide a valid party import batch (max 100 rows).",
			parsed.details,
		);
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.import_approve",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await upsertPartiesByCode(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				sourceSystem: parsed.data.sourceSystem,
				dryRun: false,
				approved: true,
				rows: parsed.data.rows,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (mapped.ok) {
			revalidatePath("/admin/master-data");
			revalidatePath("/client/master-data");
		}
		return mapped;
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "applyMasterDataImportAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not apply master-data import. Try again or contact an admin.",
			correlationId,
		);
	}
}
