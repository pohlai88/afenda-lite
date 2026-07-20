"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import type { ImportReconciliationReport } from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { runApplyMasterDataImport } from "@/lib/erp/master-data-import";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

export type ApplyMasterDataImportActionData = ImportReconciliationReport;

/**
 * Apply bounded upsert-by-code — `master_data.import_approve`.
 * Stamps package `approved: true` after the permission gate (never trust client).
 * Supports party, item_group, item, and warehouse batches.
 */
export async function applyMasterDataImportAction(
	input: unknown,
): Promise<ActionResult<ApplyMasterDataImportActionData>> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	try {
		const mapped = await runApplyMasterDataImport({
			session,
			raw: input,
		});
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
