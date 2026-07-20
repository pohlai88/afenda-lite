import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";
import { requireMasterCommandPermission } from "./authorization";
import { itemGroupIdSchema, refUomIdSchema } from "./brands";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import type { MasterFailureDetails } from "./contracts/reasons";
import { createPartyExternalId, findPartyByExternalId } from "./extensions";
import { createItem, updateItem } from "./item";
import { createItemGroup, updateItemGroup } from "./item-group";
import {
	MASTER_COMMAND_IMPORT_UPSERT_ITEM_GROUPS,
	MASTER_COMMAND_IMPORT_UPSERT_ITEMS,
	MASTER_COMMAND_IMPORT_UPSERT_PARTIES,
	MASTER_COMMAND_IMPORT_UPSERT_WAREHOUSES,
	MASTER_COMMAND_IMPORT_VALIDATE_PARTY_BATCH,
} from "./module-ids";
import { parseMasterInput } from "./parse-input";
import { createParty, updateParty } from "./party";
import { normalizeMasterCode } from "./shared/code";
import { ITEM_TYPES, PARTY_KINDS, WAREHOUSE_LOCATION_TYPES } from "./types";
import { createWarehouse, updateWarehouse } from "./warehouse";

export const MAX_IMPORT_BATCH_SIZE = 100 as const;

export const IMPORT_MODES = [
	"create_only",
	"update_existing",
	"create_or_update",
] as const;

export type ImportMode = (typeof IMPORT_MODES)[number];

/** Fields upsert-by-code may mutate; lifecycle / codes / kinds use named commands. */
export const PARTY_IMPORT_MUTABLE_FIELDS = ["name"] as const;
export const ITEM_GROUP_IMPORT_MUTABLE_FIELDS = ["name"] as const;
export const ITEM_IMPORT_MUTABLE_FIELDS = ["name"] as const;
export const WAREHOUSE_IMPORT_MUTABLE_FIELDS = ["name"] as const;

export const IMPORT_ROW_OUTCOMES = [
	"create",
	"update",
	"unchanged",
	"rejected",
	"conflict",
] as const;

export type ImportRowOutcome = (typeof IMPORT_ROW_OUTCOMES)[number];

export type ImportRowResult = {
	rowIndex: number;
	code: string;
	outcome: ImportRowOutcome;
	entityId?: string;
	message?: string;
	reason?: string;
};

export type ImportReconciliationReport = {
	sourceSystem: string;
	dryRun: boolean;
	mode: ImportMode;
	organizationId: string;
	total: number;
	created: number;
	updated: number;
	unchanged: number;
	rejected: number;
	conflicted: number;
	rows: ImportRowResult[];
};

const orgImportContextSchema = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	sourceSystem: z.string().trim().min(1).max(64),
	mode: z.enum(IMPORT_MODES).default("create_or_update"),
	dryRun: z.boolean().default(false),
	/** Required true when dryRun is false (DNA §13 approved → applied). */
	approved: z.boolean().default(false),
	/** Required on apply — dry-run/validate may omit. */
	idempotencyKey: z.string().trim().min(1).max(128).optional(),
});

function requireApprovedForApply(ctx: {
	dryRun: boolean;
	approved: boolean;
}): Result<void> {
	if (!ctx.dryRun && !ctx.approved) {
		return fail("CONFLICT", "Import batch is not approved", {
			reason: "MASTER_IMPORT_NOT_APPROVED",
		} satisfies MasterFailureDetails);
	}
	return ok(undefined);
}

function requireIdempotencyKeyForApply(ctx: {
	dryRun: boolean;
	idempotencyKey?: string;
}): Result<string | undefined> {
	if (ctx.dryRun) {
		return ok(undefined);
	}
	if (ctx.idempotencyKey === undefined || ctx.idempotencyKey.length === 0) {
		return fail("BAD_REQUEST", "Import apply requires idempotencyKey", {
			reason: "MASTER_VALIDATION_FAILED",
		} satisfies MasterFailureDetails);
	}
	return ok(ctx.idempotencyKey);
}

async function runImportWithIdempotency(input: {
	store: Awaited<ReturnType<typeof resolveCommandDeps>>["store"];
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	sourceSystem: string;
	mode: ImportMode;
	idempotencyKey: string | undefined;
	entityType: "party" | "item" | "item_group" | "warehouse";
	run: () => Promise<Result<ImportReconciliationReport>>;
}): Promise<Result<ImportReconciliationReport>> {
	if (input.idempotencyKey !== undefined) {
		const existing = await input.store.getImportBatchByIdempotencyKey(
			input.organizationId,
			input.idempotencyKey,
		);
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return ok(existing.data.report as ImportReconciliationReport);
		}
	}

	const report = await input.run();
	if (!report.ok) {
		return report;
	}

	if (input.idempotencyKey !== undefined) {
		const saved = await input.store.saveImportBatch({
			organizationId: input.organizationId,
			idempotencyKey: input.idempotencyKey,
			entityType: input.entityType,
			sourceSystem: input.sourceSystem,
			mode: input.mode,
			report: report.data,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
		});
		if (!saved.ok) {
			const replay = await input.store.getImportBatchByIdempotencyKey(
				input.organizationId,
				input.idempotencyKey,
			);
			if (replay.ok && replay.data !== null) {
				return ok(replay.data.report as ImportReconciliationReport);
			}
			return saved;
		}
	}

	return report;
}

const partyImportRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	partyKind: z.enum(PARTY_KINDS),
	expectedVersion: z.number().int().positive().optional(),
	externalId: z
		.object({
			system: z.string().trim().min(1).max(64),
			namespace: z.string().trim().max(64).default(""),
			externalId: z.string().trim().min(1).max(128),
		})
		.optional(),
});

const itemGroupImportRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	expectedVersion: z.number().int().positive().optional(),
});

const itemImportRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	itemType: z.enum(ITEM_TYPES),
	baseUomId: refUomIdSchema,
	itemGroupId: itemGroupIdSchema,
	expectedVersion: z.number().int().positive().optional(),
});

const warehouseImportRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	locationType: z.enum(WAREHOUSE_LOCATION_TYPES),
	expectedVersion: z.number().int().positive().optional(),
});

const upsertPartiesByCodeInputSchema = orgImportContextSchema.extend({
	rows: z.array(partyImportRowSchema).min(1).max(MAX_IMPORT_BATCH_SIZE),
});

const upsertItemGroupsByCodeInputSchema = orgImportContextSchema.extend({
	rows: z.array(itemGroupImportRowSchema).min(1).max(MAX_IMPORT_BATCH_SIZE),
});

const upsertItemsByCodeInputSchema = orgImportContextSchema.extend({
	rows: z.array(itemImportRowSchema).min(1).max(MAX_IMPORT_BATCH_SIZE),
});

const upsertWarehousesByCodeInputSchema = orgImportContextSchema.extend({
	rows: z.array(warehouseImportRowSchema).min(1).max(MAX_IMPORT_BATCH_SIZE),
});

function summarize(
	rows: ImportRowResult[],
): Omit<
	ImportReconciliationReport,
	"sourceSystem" | "dryRun" | "mode" | "organizationId" | "rows"
> {
	return {
		total: rows.length,
		created: rows.filter((r) => r.outcome === "create").length,
		updated: rows.filter((r) => r.outcome === "update").length,
		unchanged: rows.filter((r) => r.outcome === "unchanged").length,
		rejected: rows.filter((r) => r.outcome === "rejected").length,
		conflicted: rows.filter((r) => r.outcome === "conflict").length,
	};
}

function modeBlocksCreate(
	mode: ImportMode,
	rowIndex: number,
	code: string,
): ImportRowResult | null {
	if (mode === "update_existing") {
		return {
			rowIndex,
			code,
			outcome: "rejected",
			message: "Import mode update_existing forbids creates",
			reason: "MASTER_VALIDATION_FAILED",
		};
	}
	return null;
}

function modeBlocksUpdate(
	mode: ImportMode,
	rowIndex: number,
	code: string,
	entityId: string,
): ImportRowResult | null {
	if (mode === "create_only") {
		return {
			rowIndex,
			code,
			outcome: "rejected",
			entityId,
			message: "Import mode create_only forbids updates",
			reason: "MASTER_VALIDATION_FAILED",
		};
	}
	return null;
}

function markInFileDuplicates(
	codes: ReadonlyArray<{ rowIndex: number; normalizedCode: string }>,
): Set<number> {
	const seen = new Map<string, number>();
	const duplicateIndexes = new Set<number>();
	for (const row of codes) {
		const prior = seen.get(row.normalizedCode);
		if (prior !== undefined) {
			duplicateIndexes.add(prior);
			duplicateIndexes.add(row.rowIndex);
		} else {
			seen.set(row.normalizedCode, row.rowIndex);
		}
	}
	return duplicateIndexes;
}

/**
 * Bounded-batch party upsert-by-code with dry-run and reconciliation report.
 * Never one TX for unbounded files — caller chunks to `MAX_IMPORT_BATCH_SIZE`.
 */
export async function upsertPartiesByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ImportReconciliationReport>> {
	const parsed = parseMasterInput(
		upsertPartiesByCodeInputSchema,
		input,
		"Invalid party bulk upsert input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const approvedGate = requireApprovedForApply(parsed.data);
	if (!approvedGate.ok) {
		return approvedGate;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: parsed.data.dryRun
			? MASTER_COMMAND_IMPORT_VALIDATE_PARTY_BATCH
			: MASTER_COMMAND_IMPORT_UPSERT_PARTIES,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const idempotencyKeyResult = requireIdempotencyKeyForApply(parsed.data);
	if (!idempotencyKeyResult.ok) {
		return idempotencyKeyResult;
	}
	const ctx = parsed.data;
	return runImportWithIdempotency({
		store,
		organizationId: ctx.organizationId,
		actorUserId: ctx.actorUserId,
		correlationId: ctx.correlationId,
		sourceSystem: ctx.sourceSystem,
		mode: ctx.mode,
		idempotencyKey: idempotencyKeyResult.data,
		entityType: "party",
		run: async () => upsertPartiesByCodeBody(ctx, options),
	});
}

async function upsertPartiesByCodeBody(
	ctx: z.infer<typeof upsertPartiesByCodeInputSchema>,
	options: MasterCommandOptions,
): Promise<Result<ImportReconciliationReport>> {
	const { store } = resolveCommandDeps(options);
	const results: ImportRowResult[] = [];

	const normalizedRows: Array<{
		rowIndex: number;
		normalizedCode: string;
		code: string;
		row: z.infer<typeof partyImportRowSchema>;
	}> = [];

	for (let rowIndex = 0; rowIndex < ctx.rows.length; rowIndex += 1) {
		const row = ctx.rows[rowIndex];
		if (row === undefined) {
			continue;
		}
		const codeResult = normalizeMasterCode(row.code);
		if (!codeResult.ok) {
			results.push({
				rowIndex,
				code: row.code,
				outcome: "rejected",
				message: codeResult.message,
				reason: "MASTER_VALIDATION_FAILED",
			});
			continue;
		}
		normalizedRows.push({
			rowIndex,
			normalizedCode: codeResult.data.normalizedCode,
			code: codeResult.data.code,
			row,
		});
	}

	const duplicates = markInFileDuplicates(normalizedRows);
	for (const entry of normalizedRows) {
		if (duplicates.has(entry.rowIndex)) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "conflict",
				message: "Duplicate code within import batch",
				reason: "MASTER_DUPLICATE",
			});
		}
	}
	const duplicateSet = duplicates;

	for (const entry of normalizedRows) {
		if (duplicateSet.has(entry.rowIndex)) {
			continue;
		}

		if (entry.row.externalId) {
			const existingByExt = await findPartyByExternalId(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					system: entry.row.externalId.system,
					namespace: entry.row.externalId.namespace,
					externalId: entry.row.externalId.externalId,
				},
				options,
			);
			if (!existingByExt.ok) {
				results.push({
					rowIndex: entry.rowIndex,
					code: entry.code,
					outcome: "rejected",
					message: existingByExt.message,
				});
				continue;
			}
			if (
				existingByExt.data !== null &&
				existingByExt.data.normalizedCode !== entry.normalizedCode
			) {
				results.push({
					rowIndex: entry.rowIndex,
					code: entry.code,
					outcome: "conflict",
					message: "External id already bound to a different party",
					reason: "MASTER_DUPLICATE",
					entityId: existingByExt.data.id,
				});
				continue;
			}
		}

		const existing = await store.getPartyByCode(
			ctx.organizationId,
			entry.normalizedCode,
		);
		if (!existing.ok) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "rejected",
				message: existing.message,
			});
			continue;
		}

		if (existing.data === null) {
			const createBlocked = modeBlocksCreate(
				ctx.mode,
				entry.rowIndex,
				entry.code,
			);
			if (createBlocked) {
				results.push(createBlocked);
				continue;
			}
			if (ctx.dryRun) {
				results.push({
					rowIndex: entry.rowIndex,
					code: entry.code,
					outcome: "create",
					message: "Would create party",
				});
				continue;
			}
			const created = await createParty(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					code: entry.code,
					name: entry.row.name,
					partyKind: entry.row.partyKind,
				},
				options,
			);
			if (!created.ok) {
				results.push({
					rowIndex: entry.rowIndex,
					code: entry.code,
					outcome: "rejected",
					message: created.message,
					reason: (created.details as MasterFailureDetails | undefined)?.reason,
				});
				continue;
			}
			if (entry.row.externalId) {
				const ext = await createPartyExternalId(
					{
						organizationId: ctx.organizationId,
						actorUserId: ctx.actorUserId,
						correlationId: ctx.correlationId,
						partyId: created.data.id,
						system: entry.row.externalId.system,
						namespace: entry.row.externalId.namespace,
						externalId: entry.row.externalId.externalId,
					},
					options,
				);
				if (!ext.ok) {
					results.push({
						rowIndex: entry.rowIndex,
						code: entry.code,
						outcome: "conflict",
						entityId: created.data.id,
						message: ext.message,
						reason: (ext.details as MasterFailureDetails | undefined)?.reason,
					});
					continue;
				}
			}
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "create",
				entityId: created.data.id,
			});
			continue;
		}

		const current = existing.data;
		if (current.partyKind !== entry.row.partyKind) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "rejected",
				entityId: current.id,
				message:
					"partyKind is immutable on import; only name may update via upsert",
				reason: "MASTER_VALIDATION_FAILED",
			});
			continue;
		}
		if (
			entry.row.expectedVersion !== undefined &&
			entry.row.expectedVersion !== current.version
		) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "conflict",
				entityId: current.id,
				message: `Version conflict: expected ${entry.row.expectedVersion}, found ${current.version}`,
				reason: "MASTER_VERSION_CONFLICT",
			});
			continue;
		}

		if (current.name === entry.row.name) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "unchanged",
				entityId: current.id,
			});
			continue;
		}

		const updateBlocked = modeBlocksUpdate(
			ctx.mode,
			entry.rowIndex,
			entry.code,
			current.id,
		);
		if (updateBlocked) {
			results.push(updateBlocked);
			continue;
		}

		if (ctx.dryRun) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "update",
				entityId: current.id,
				message: "Would update party",
			});
			continue;
		}

		const updated = await updateParty(
			{
				organizationId: ctx.organizationId,
				actorUserId: ctx.actorUserId,
				correlationId: ctx.correlationId,
				id: current.id,
				expectedVersion: current.version,
				name: entry.row.name,
			},
			options,
		);
		if (!updated.ok) {
			const reason = (updated.details as MasterFailureDetails | undefined)
				?.reason;
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: reason === "MASTER_VERSION_CONFLICT" ? "conflict" : "rejected",
				entityId: current.id,
				message: updated.message,
				reason,
			});
			continue;
		}
		results.push({
			rowIndex: entry.rowIndex,
			code: entry.code,
			outcome: "update",
			entityId: updated.data.id,
		});
	}

	results.sort((a, b) => a.rowIndex - b.rowIndex);
	return ok({
		sourceSystem: ctx.sourceSystem,
		dryRun: ctx.dryRun,
		mode: ctx.mode,
		organizationId: ctx.organizationId,
		...summarize(results),
		rows: results,
	});
}

async function upsertByCodeGeneric<
	TRow extends { code: string; name: string; expectedVersion?: number },
>(
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		sourceSystem: string;
		mode: ImportMode;
		dryRun: boolean;
		approved: boolean;
		idempotencyKey?: string;
		entityType: "item" | "item_group" | "warehouse";
		rows: TRow[];
	},
	options: MasterCommandOptions,
	handlers: {
		getByCode: (
			organizationId: string,
			normalizedCode: string,
		) => Promise<Result<{ id: string; name: string; version: number } | null>>;
		create: (row: TRow, code: string) => Promise<Result<{ id: string }>>;
		update: (
			row: TRow,
			existing: { id: string; version: number },
		) => Promise<Result<{ id: string }>>;
		isUnchanged: (existing: { name: string }, row: TRow) => boolean;
		/** Reject when row tries to change fields outside the mutable allowlist. */
		rejectImmutable?: (
			existing: { id: string; name: string; version: number },
			row: TRow,
			rowIndex: number,
			code: string,
		) => ImportRowResult | null;
	},
): Promise<Result<ImportReconciliationReport>> {
	const approvedGate = requireApprovedForApply(input);
	if (!approvedGate.ok) {
		return approvedGate;
	}
	const idempotencyKeyResult = requireIdempotencyKeyForApply(input);
	if (!idempotencyKeyResult.ok) {
		return idempotencyKeyResult;
	}
	const { store } = resolveCommandDeps(options);
	return runImportWithIdempotency({
		store,
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		sourceSystem: input.sourceSystem,
		mode: input.mode,
		idempotencyKey: idempotencyKeyResult.data,
		entityType: input.entityType,
		run: async () => upsertByCodeGenericBody(input, handlers),
	});
}

async function upsertByCodeGenericBody<
	TRow extends { code: string; name: string; expectedVersion?: number },
>(
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		sourceSystem: string;
		mode: ImportMode;
		dryRun: boolean;
		rows: TRow[];
	},
	handlers: {
		getByCode: (
			organizationId: string,
			normalizedCode: string,
		) => Promise<Result<{ id: string; name: string; version: number } | null>>;
		create: (row: TRow, code: string) => Promise<Result<{ id: string }>>;
		update: (
			row: TRow,
			existing: { id: string; version: number },
		) => Promise<Result<{ id: string }>>;
		isUnchanged: (existing: { name: string }, row: TRow) => boolean;
		rejectImmutable?: (
			existing: { id: string; name: string; version: number },
			row: TRow,
			rowIndex: number,
			code: string,
		) => ImportRowResult | null;
	},
): Promise<Result<ImportReconciliationReport>> {
	const results: ImportRowResult[] = [];
	const normalizedRows: Array<{
		rowIndex: number;
		normalizedCode: string;
		code: string;
		row: TRow;
	}> = [];

	for (let rowIndex = 0; rowIndex < input.rows.length; rowIndex += 1) {
		const row = input.rows[rowIndex];
		if (row === undefined) {
			continue;
		}
		const codeResult = normalizeMasterCode(row.code);
		if (!codeResult.ok) {
			results.push({
				rowIndex,
				code: row.code,
				outcome: "rejected",
				message: codeResult.message,
				reason: "MASTER_VALIDATION_FAILED",
			});
			continue;
		}
		normalizedRows.push({
			rowIndex,
			normalizedCode: codeResult.data.normalizedCode,
			code: codeResult.data.code,
			row,
		});
	}

	const duplicates = markInFileDuplicates(normalizedRows);
	for (const entry of normalizedRows) {
		if (duplicates.has(entry.rowIndex)) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "conflict",
				message: "Duplicate code within import batch",
				reason: "MASTER_DUPLICATE",
			});
		}
	}

	for (const entry of normalizedRows) {
		if (duplicates.has(entry.rowIndex)) {
			continue;
		}
		const existing = await handlers.getByCode(
			input.organizationId,
			entry.normalizedCode,
		);
		if (!existing.ok) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "rejected",
				message: existing.message,
			});
			continue;
		}
		if (existing.data === null) {
			const createBlocked = modeBlocksCreate(
				input.mode,
				entry.rowIndex,
				entry.code,
			);
			if (createBlocked) {
				results.push(createBlocked);
				continue;
			}
			if (input.dryRun) {
				results.push({
					rowIndex: entry.rowIndex,
					code: entry.code,
					outcome: "create",
					message: "Would create",
				});
				continue;
			}
			const created = await handlers.create(entry.row, entry.code);
			if (!created.ok) {
				results.push({
					rowIndex: entry.rowIndex,
					code: entry.code,
					outcome: "rejected",
					message: created.message,
				});
				continue;
			}
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "create",
				entityId: created.data.id,
			});
			continue;
		}

		const current = existing.data;
		const immutableReject = handlers.rejectImmutable?.(
			current,
			entry.row,
			entry.rowIndex,
			entry.code,
		);
		if (immutableReject) {
			results.push(immutableReject);
			continue;
		}
		if (
			entry.row.expectedVersion !== undefined &&
			entry.row.expectedVersion !== current.version
		) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "conflict",
				entityId: current.id,
				message: `Version conflict: expected ${entry.row.expectedVersion}, found ${current.version}`,
				reason: "MASTER_VERSION_CONFLICT",
			});
			continue;
		}
		if (handlers.isUnchanged(current, entry.row)) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "unchanged",
				entityId: current.id,
			});
			continue;
		}
		const updateBlocked = modeBlocksUpdate(
			input.mode,
			entry.rowIndex,
			entry.code,
			current.id,
		);
		if (updateBlocked) {
			results.push(updateBlocked);
			continue;
		}
		if (input.dryRun) {
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "update",
				entityId: current.id,
				message: "Would update",
			});
			continue;
		}
		const updated = await handlers.update(entry.row, current);
		if (!updated.ok) {
			const reason = (updated.details as MasterFailureDetails | undefined)
				?.reason;
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: reason === "MASTER_VERSION_CONFLICT" ? "conflict" : "rejected",
				entityId: current.id,
				message: updated.message,
				reason,
			});
			continue;
		}
		results.push({
			rowIndex: entry.rowIndex,
			code: entry.code,
			outcome: "update",
			entityId: updated.data.id,
		});
	}

	results.sort((a, b) => a.rowIndex - b.rowIndex);
	return ok({
		sourceSystem: input.sourceSystem,
		dryRun: input.dryRun,
		mode: input.mode,
		organizationId: input.organizationId,
		...summarize(results),
		rows: results,
	});
}

export async function upsertItemGroupsByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ImportReconciliationReport>> {
	const parsed = parseMasterInput(
		upsertItemGroupsByCodeInputSchema,
		input,
		"Invalid item-group bulk upsert input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_IMPORT_UPSERT_ITEM_GROUPS,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const ctx = parsed.data;
	return upsertByCodeGeneric(
		{ ...ctx, entityType: "item_group" },
		options,
		{
		getByCode: async (organizationId, normalizedCode) => {
			const result = await store.getItemGroupByCode(
				organizationId,
				normalizedCode,
			);
			if (!result.ok) {
				return result;
			}
			if (result.data === null) {
				return ok(null);
			}
			return ok({
				id: result.data.id,
				name: result.data.name,
				version: result.data.version,
			});
		},
		create: async (row, code) =>
			createItemGroup(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					code,
					name: row.name,
				},
				options,
			),
		update: async (row, existing) =>
			updateItemGroup(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					id: existing.id,
					expectedVersion: existing.version,
					name: row.name,
				},
				options,
			),
		isUnchanged: (existing, row) => existing.name === row.name,
	},
	);
}

export async function upsertItemsByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ImportReconciliationReport>> {
	const parsed = parseMasterInput(
		upsertItemsByCodeInputSchema,
		input,
		"Invalid item bulk upsert input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_IMPORT_UPSERT_ITEMS,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const ctx = parsed.data;
	const itemSnapshot = new Map<
		string,
		{ itemType: string; baseUomId: string; itemGroupId: string }
	>();
	return upsertByCodeGeneric({ ...ctx, entityType: "item" }, options, {
		getByCode: async (organizationId, normalizedCode) => {
			const result = await store.getItemByCode(organizationId, normalizedCode);
			if (!result.ok) {
				return result;
			}
			if (result.data === null) {
				return ok(null);
			}
			itemSnapshot.set(result.data.id, {
				itemType: result.data.itemType,
				baseUomId: result.data.baseUomId,
				itemGroupId: result.data.itemGroupId,
			});
			return ok({
				id: result.data.id,
				name: result.data.name,
				version: result.data.version,
			});
		},
		create: async (row, code) =>
			createItem(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					code,
					name: row.name,
					itemType: row.itemType,
					baseUomId: row.baseUomId,
					itemGroupId: row.itemGroupId,
				},
				options,
			),
		update: async (row, existing) =>
			updateItem(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					id: existing.id,
					expectedVersion: existing.version,
					name: row.name,
				},
				options,
			),
		isUnchanged: (existing, row) => existing.name === row.name,
		rejectImmutable: (existing, row, rowIndex, code) => {
			const snap = itemSnapshot.get(existing.id);
			if (
				snap !== undefined &&
				(snap.itemType !== row.itemType ||
					snap.baseUomId !== row.baseUomId ||
					snap.itemGroupId !== row.itemGroupId)
			) {
				return {
					rowIndex,
					code,
					outcome: "rejected",
					entityId: existing.id,
					message:
						"itemType, baseUomId, and itemGroupId are immutable on import; only name may update",
					reason: "MASTER_VALIDATION_FAILED",
				};
			}
			return null;
		},
	});
}

export async function upsertWarehousesByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ImportReconciliationReport>> {
	const parsed = parseMasterInput(
		upsertWarehousesByCodeInputSchema,
		input,
		"Invalid warehouse bulk upsert input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_IMPORT_UPSERT_WAREHOUSES,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const ctx = parsed.data;
	const warehouseSnapshot = new Map<string, { locationType: string }>();
	return upsertByCodeGeneric({ ...ctx, entityType: "warehouse" }, options, {
		getByCode: async (organizationId, normalizedCode) => {
			const result = await store.getWarehouseByCode(
				organizationId,
				normalizedCode,
			);
			if (!result.ok) {
				return result;
			}
			if (result.data === null) {
				return ok(null);
			}
			warehouseSnapshot.set(result.data.id, {
				locationType: result.data.locationType,
			});
			return ok({
				id: result.data.id,
				name: result.data.name,
				version: result.data.version,
			});
		},
		create: async (row, code) =>
			createWarehouse(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					code,
					name: row.name,
					locationType: row.locationType,
				},
				options,
			),
		update: async (row, existing) =>
			updateWarehouse(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					id: existing.id,
					expectedVersion: existing.version,
					name: row.name,
				},
				options,
			),
		isUnchanged: (existing, row) => existing.name === row.name,
		rejectImmutable: (existing, row, rowIndex, code) => {
			const snap = warehouseSnapshot.get(existing.id);
			if (snap !== undefined && snap.locationType !== row.locationType) {
				return {
					rowIndex,
					code,
					outcome: "rejected",
					entityId: existing.id,
					message:
						"locationType is immutable on import; only name may update",
					reason: "MASTER_VALIDATION_FAILED",
				};
			}
			return null;
		},
	});
}

/** Validate-only alias — dry-run party upsert (`master_data.manage`). */
export async function validatePartyImportBatch(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ImportReconciliationReport>> {
	const parsed = parseMasterInput(
		upsertPartiesByCodeInputSchema,
		input,
		"Invalid party import validate input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	return upsertPartiesByCode(
		{ ...parsed.data, dryRun: true, approved: false },
		options,
	);
}
