"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
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
 * owns row outcomes. `master_data.import_validate`.
 */
export async function validateMasterDataImportAction(
	input: unknown,
): Promise<ActionResult<ValidateMasterDataImportActionData>> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(validateImportSchema, input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Provide a valid party import batch (max 100 rows).",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.import_validate",
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
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "validateMasterDataImportAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
