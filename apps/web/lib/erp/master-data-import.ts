import type { Session } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	IMPORT_MODES,
	type ImportReconciliationReport,
	ITEM_TYPES,
	PARTY_KINDS,
	upsertItemGroupsByCode,
	upsertItemsByCode,
	upsertPartiesByCode,
	upsertWarehousesByCode,
	WAREHOUSE_LOCATION_TYPES,
} from "@afenda/master-data";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import type { ActionResult } from "@/modules/platform/schemas/action-result";
import { actionFail } from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const partyRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	partyKind: z.enum(PARTY_KINDS),
	expectedVersion: z.number().int().positive().optional(),
});

const itemGroupRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	expectedVersion: z.number().int().positive().optional(),
});

const itemRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	itemType: z.enum(ITEM_TYPES),
	baseUomId: z.string().uuid(),
	itemGroupId: z.string().uuid(),
	expectedVersion: z.number().int().positive().optional(),
});

const warehouseRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	locationType: z.enum(WAREHOUSE_LOCATION_TYPES),
	expectedVersion: z.number().int().positive().optional(),
});

export const applyMasterDataImportSchema = z.discriminatedUnion("entity", [
	z.object({
		entity: z.literal("party"),
		sourceSystem: z.string().trim().min(1).max(64),
		mode: z.enum(IMPORT_MODES).default("create_or_update"),
		idempotencyKey: z.string().trim().min(1).max(128),
		rows: z.array(partyRowSchema).min(1).max(100),
	}),
	z.object({
		entity: z.literal("item_group"),
		sourceSystem: z.string().trim().min(1).max(64),
		mode: z.enum(IMPORT_MODES).default("create_or_update"),
		idempotencyKey: z.string().trim().min(1).max(128),
		rows: z.array(itemGroupRowSchema).min(1).max(100),
	}),
	z.object({
		entity: z.literal("item"),
		sourceSystem: z.string().trim().min(1).max(64),
		mode: z.enum(IMPORT_MODES).default("create_or_update"),
		idempotencyKey: z.string().trim().min(1).max(128),
		rows: z.array(itemRowSchema).min(1).max(100),
	}),
	z.object({
		entity: z.literal("warehouse"),
		sourceSystem: z.string().trim().min(1).max(64),
		mode: z.enum(IMPORT_MODES).default("create_or_update"),
		idempotencyKey: z.string().trim().min(1).max(128),
		rows: z.array(warehouseRowSchema).min(1).max(100),
	}),
]);

export type ApplyMasterDataImportInput = z.infer<
	typeof applyMasterDataImportSchema
>;

export async function runApplyMasterDataImport(input: {
	session: Session;
	raw: unknown;
}): Promise<ActionResult<ImportReconciliationReport>> {
	const parsed = parseSchema(applyMasterDataImportSchema, input.raw);
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Provide a valid master-data import batch (max 100 rows) with idempotencyKey.",
			parsed.details,
		);
	}

	const permissionDenied = await forbidUnlessPermission(
		input.session,
		"master_data.import_approve",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	const correlationId = createCorrelationId();
	const authorization = createMasterDataAuthorizationPort();
	const base = {
		organizationId: input.session.orgId,
		actorUserId: input.session.userId,
		correlationId,
		sourceSystem: parsed.data.sourceSystem,
		mode: parsed.data.mode,
		dryRun: false as const,
		approved: true as const,
		idempotencyKey: parsed.data.idempotencyKey,
		rows: parsed.data.rows,
	};

	const result =
		parsed.data.entity === "party"
			? await upsertPartiesByCode(base, { authorization })
			: parsed.data.entity === "item_group"
				? await upsertItemGroupsByCode(base, { authorization })
				: parsed.data.entity === "item"
					? await upsertItemsByCode(base, { authorization })
					: await upsertWarehousesByCode(base, { authorization });

	return mapPackageResult(result);
}
