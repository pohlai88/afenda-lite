"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	IMPORT_MODES,
	type ImportReconciliationReport,
	PARTY_KINDS,
	validatePartyImportBatch,
} from "@afenda/master-data";
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

export type ValidateMasterDataImportActionData = ImportReconciliationReport;

const partyRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	partyKind: z.enum(PARTY_KINDS),
	expectedVersion: z.number().int().positive().optional(),
});

const validateImportSchema = z.object({
	sourceSystem: z.string().trim().min(1).max(64),
	entity: z.literal("party"),
	mode: z.enum(IMPORT_MODES).default("create_or_update"),
	rows: z.array(partyRowSchema).min(1).max(100),
});

/**
 * Dry-run master-data import validate — file parse stays in the app; package
 * owns row outcomes. `master_data.manage`.
 */
export async function validateMasterDataImportAction(
	input: unknown,
): Promise<ActionResult<ValidateMasterDataImportActionData>> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const parsed = parseSchema(validateImportSchema, input);
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Provide a valid party import batch (max 100 rows).",
			parsed.details,
		);
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await validatePartyImportBatch(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				sourceSystem: parsed.data.sourceSystem,
				mode: parsed.data.mode,
				rows: parsed.data.rows,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		return mapPackageResult(result);
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "validateMasterDataImportAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not validate master-data import. Try again or contact an admin.",
			correlationId,
		);
	}
}
