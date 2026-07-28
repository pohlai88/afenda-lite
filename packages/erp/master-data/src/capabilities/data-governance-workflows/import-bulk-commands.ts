import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";
import { requireMasterCommandPermission } from "../../authorization";
import { itemGroupIdSchema } from "../../brands";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "../../command-options";
import {
	expectedVersionSchema,
	idempotencyKeySchema,
	orgActorContextSchema,
} from "../../contracts/context";
import type { MasterFailureDetails } from "../../contracts/reasons";
import {
	MASTER_COMMAND_IMPORT_UPSERT_ITEM_GROUPS,
	MASTER_COMMAND_IMPORT_UPSERT_ITEMS,
	MASTER_COMMAND_IMPORT_UPSERT_PARTIES,
	MASTER_COMMAND_IMPORT_UPSERT_WAREHOUSES,
	MASTER_COMMAND_IMPORT_VALIDATE_PARTY_BATCH,
	MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE,
	MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE_REGULATORY,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import { ITEM_TYPES, PARTY_KINDS, WAREHOUSE_LOCATION_TYPES } from "../../types";
import { createItem, updateItem } from "../core-organization-masters/item";
import {
	createItemGroup,
	updateItemGroup,
} from "../core-organization-masters/item-group";
import { normalizeMasterCode } from "../core-organization-masters/normalized-code";
import { createParty, updateParty } from "../core-organization-masters/party";
import type { ImportBatchRowRecord } from "../core-organization-masters/store";
import {
	createWarehouse,
	updateWarehouse,
} from "../core-organization-masters/warehouse";
import { findPartyByExternalId } from "../extensions";
import { isRegulatoryExternalIdType } from "../extensions/extension-authorization-policy";
import { normalizeExternalId } from "../extensions/external-id-normalization";
import { approvedApplyAttemptGate } from "../lifecycle-governance";
import { refUomIdSchema } from "../platform-references/brands";
import { hashImportPayload, hashImportRow } from "./import-idempotency";
import type { ImportBatchStatus } from "./import-types";

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

export type ImportReportPayload = Record<string, unknown>;

export type ImportRowApplicationResult = Readonly<{
	outcome: ImportRowOutcome;
	message: string | null;
	reason: string | null;
}>;

export type ImportRowResult = {
	rowIndex: number;
	sourceRowNumber: number;
	code: string;
	outcome: ImportRowOutcome;
	rawPayload: ImportReportPayload;
	normalizedPayload: ImportReportPayload;
	matchedTargetId: string | null;
	intendedOperation: "create" | "update" | "skip" | "reject";
	validationErrors: string[];
	applicationResult: ImportRowApplicationResult;
	resultingEntityId: string | null;
	resultingEntityVersion: number | null;
	entityId?: string;
	message?: string;
	reason?: string;
};

type ImportRowResultDraft = Readonly<{
	rowIndex: number;
	code: string;
	outcome: ImportRowOutcome;
	entityId?: string;
	entityVersion?: number;
	matchedTargetId?: string | null;
	message?: string;
	reason?: string;
}>;

const importReportPayloadSchema = z.record(z.string(), z.unknown());

const importRowResultSchema = z
	.object({
		rowIndex: z.number().int().nonnegative(),
		sourceRowNumber: z.number().int().positive(),
		code: z.string(),
		outcome: z.enum(IMPORT_ROW_OUTCOMES),
		rawPayload: importReportPayloadSchema,
		normalizedPayload: importReportPayloadSchema,
		matchedTargetId: z.string().nullable(),
		intendedOperation: z.enum(["create", "update", "skip", "reject"]),
		validationErrors: z.array(z.string()).readonly(),
		applicationResult: z.object({
			outcome: z.enum(IMPORT_ROW_OUTCOMES),
			message: z.string().nullable(),
			reason: z.string().nullable(),
		}),
		resultingEntityId: z.string().nullable(),
		resultingEntityVersion: z.number().int().positive().nullable(),
		entityId: z.string().optional(),
		message: z.string().optional(),
		reason: z.string().optional(),
	})
	.readonly();

export const importReconciliationReportSchema = z
	.object({
		sourceSystem: z.string(),
		dryRun: z.boolean(),
		mode: z.enum(IMPORT_MODES),
		organizationId: z.string(),
		total: z.number().int().nonnegative(),
		created: z.number().int().nonnegative(),
		updated: z.number().int().nonnegative(),
		unchanged: z.number().int().nonnegative(),
		rejected: z.number().int().nonnegative(),
		conflicted: z.number().int().nonnegative(),
		rows: z.array(importRowResultSchema).readonly(),
	})
	.readonly();

export type ImportReconciliationReport = z.infer<
	typeof importReconciliationReportSchema
>;

const orgImportContextSchema = orgActorContextSchema.extend({
	sourceSystem: z.string().trim().min(1).max(64),
	mode: z.enum(IMPORT_MODES).default("create_or_update"),
	dryRun: z.boolean().default(false),
	/** Required true when dryRun is false (DNA §13 approved → applied). */
	approved: z.boolean().default(false),
	/**
	 * Approval evidence for orgs that require four-eyes import application.
	 * When `requireSegregatedApproval` is true, this must be a different actor
	 * from the caller applying the import.
	 */
	approvedByActorUserId: z.string().trim().min(1).optional(),
	requireSegregatedApproval: z.boolean().default(false),
	/** Required on apply — dry-run/validate may omit. */
	idempotencyKey: idempotencyKeySchema.optional(),
});

function requireApprovedForApply(ctx: {
	dryRun: boolean;
	approved: boolean;
	actorUserId?: string;
	approvedByActorUserId?: string;
	requireSegregatedApproval?: boolean;
}): Result<void> {
	if (!ctx.dryRun && !ctx.approved) {
		return fail("CONFLICT", "Import batch is not approved", {
			reason: "MASTER_IMPORT_NOT_APPROVED",
		} satisfies MasterFailureDetails);
	}
	if (!ctx.dryRun && ctx.requireSegregatedApproval === true) {
		if (ctx.approvedByActorUserId === undefined) {
			return fail(
				"BAD_REQUEST",
				"Import approval actor is required when segregation is enforced",
				{
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails,
			);
		}
		if (ctx.approvedByActorUserId === ctx.actorUserId) {
			return fail(
				"FORBIDDEN",
				"Import approve and apply actors must be different",
				{
					reason: "MASTER_MAKER_CHECKER_VIOLATION",
				} satisfies MasterFailureDetails,
			);
		}
	}
	if (!ctx.dryRun) {
		const gate = approvedApplyAttemptGate(
			"import_batch",
			"package_import_apply",
		);
		if (!gate.ok) {
			return gate;
		}
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
	operationType: string;
	rows: readonly unknown[];
	run: (
		execution?: ImportExecutionContext,
	) => Promise<Result<ImportReconciliationReport>>;
}): Promise<Result<ImportReconciliationReport>> {
	if (input.idempotencyKey === undefined) return input.run();

	const payloadHash = hashImportPayload({
		operationType: input.operationType,
		entityType: input.entityType,
		sourceSystem: input.sourceSystem,
		mode: input.mode,
		rows: input.rows,
	});
	const claimed = await input.store.claimImportBatch({
		id: randomUUID(),
		organizationId: input.organizationId,
		idempotencyKey: input.idempotencyKey,
		payloadHash,
		operationType: input.operationType,
		entityType: input.entityType,
		sourceSystem: input.sourceSystem,
		mode: input.mode,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		rows: input.rows.map((row, index) => ({
			id: randomUUID(),
			sourceRowNumber: index + 1,
			payloadHash: hashImportRow(row),
			normalizedPayload: toImportPayload(row),
		})),
	});
	if (!claimed.ok) return claimed;
	const batch = claimed.data.batch;
	if (
		batch.operationType !== input.operationType ||
		batch.entityType !== input.entityType ||
		batch.payloadHash !== payloadHash
	) {
		return fail("CONFLICT", "Idempotency key was used for another import", {
			reason: "MASTER_IDEMPOTENCY_CONFLICT",
			errorCode: "MASTER_DATA_IDEMPOTENCY_CONFLICT",
			batchId: batch.id,
			batchStatus: batch.status,
		} satisfies MasterFailureDetails);
	}
	if (batch.status === "applied") {
		return parseStoredImportReport(batch.report);
	}

	const leaseOwner = randomUUID();
	const lease = await input.store.acquireImportBatchLease({
		organizationId: input.organizationId,
		batchId: batch.id,
		leaseOwner,
		leaseExpiresAt: new Date(Date.now() + IMPORT_BATCH_LEASE_DURATION_MS),
	});
	if (!lease.ok) return lease;
	if (lease.data.kind === "completed") {
		return parseStoredImportReport(lease.data.batch.report);
	}
	if (lease.data.kind === "busy") {
		return importBatchInProgress(lease.data.batch);
	}

	const ledger = await input.store.listImportBatchRows(
		input.organizationId,
		batch.id,
	);
	if (!ledger.ok) return ledger;
	const report = await input.run({
		batchId: batch.id,
		leaseOwner,
		rows: ledger.data,
	});
	if (!report.ok) {
		const failed = await input.store.completeImportBatch({
			organizationId: input.organizationId,
			batchId: batch.id,
			leaseOwner,
			status: "failed",
			report: {
				code: report.code,
				message: report.message,
			},
			rows: input.rows.map((_, index) => ({
				sourceRowNumber: index + 1,
				intendedOperation: "reject",
				matchedEntityId: null,
				status: "failed",
				errorCode: report.code ?? null,
				errorDetails: { message: report.message },
				resultEntityId: null,
				resultVersion: null,
			})),
		});
		if (!failed.ok) return failed;
		return report;
	}

	const completed = await input.store.completeImportBatch({
		organizationId: input.organizationId,
		batchId: batch.id,
		leaseOwner,
		status: importBatchCompletionStatus(report.data),
		report: report.data,
		rows: report.data.rows.map((row) => ({
			sourceRowNumber: row.sourceRowNumber,
			intendedOperation: row.intendedOperation,
			matchedEntityId: row.matchedTargetId,
			status:
				row.outcome === "unchanged"
					? "skipped"
					: row.outcome === "rejected" || row.outcome === "conflict"
						? "failed"
						: "applied",
			errorCode: row.reason ?? null,
			errorDetails:
				row.message === undefined && row.reason === undefined
					? null
					: {
							...(row.message === undefined ? {} : { message: row.message }),
							...(row.reason === undefined ? {} : { reason: row.reason }),
						},
			resultEntityId: row.resultingEntityId,
			resultVersion: row.resultingEntityVersion,
		})),
	});
	if (!completed.ok) return completed;
	return report;
}

const IMPORT_BATCH_LEASE_DURATION_MS = 5 * 60 * 1000;

type ImportExecutionContext = {
	batchId: string;
	leaseOwner: string;
	rows: readonly ImportBatchRowRecord[];
};

function importMutationOptions(
	options: MasterCommandOptions,
	input: {
		execution: ImportExecutionContext | undefined;
		organizationId: string;
		rowIndex: number;
		intendedOperation: "create" | "update";
		matchedEntityId: string | null;
		partyExternalIds?: NonNullable<
			MasterCommandOptions["importMutation"]
		>["partyExternalIds"];
	},
): MasterCommandOptions {
	if (input.execution === undefined) return options;
	return {
		...options,
		importMutation: {
			organizationId: input.organizationId,
			batchId: input.execution.batchId,
			sourceRowNumber: input.rowIndex + 1,
			leaseOwner: input.execution.leaseOwner,
			intendedOperation: input.intendedOperation,
			matchedEntityId: input.matchedEntityId,
			partyExternalIds: input.partyExternalIds,
		},
	};
}

function resumedAppliedResults<TRow extends { code: string }>(
	execution: ImportExecutionContext | undefined,
	rows: readonly TRow[],
): { results: ImportRowResultDraft[]; rowIndexes: ReadonlySet<number> } {
	const results: ImportRowResultDraft[] = [];
	const rowIndexes = new Set<number>();
	if (execution === undefined) return { results, rowIndexes };
	for (const ledgerRow of execution.rows) {
		if (ledgerRow.status !== "applied") continue;
		const rowIndex = ledgerRow.sourceRowNumber - 1;
		const row = rows[rowIndex];
		if (row === undefined) continue;
		rowIndexes.add(rowIndex);
		results.push({
			rowIndex,
			code: row.code,
			outcome: ledgerRow.intendedOperation === "update" ? "update" : "create",
			entityId: ledgerRow.resultEntityId ?? undefined,
			entityVersion: ledgerRow.resultVersion ?? undefined,
		});
	}
	return { results, rowIndexes };
}

function parseStoredImportReport(
	report: unknown | null,
): Result<ImportReconciliationReport> {
	const parsed = importReconciliationReportSchema.safeParse(report);
	if (!parsed.success) {
		return fail("INTERNAL_ERROR", "Stored import report is invalid");
	}
	return ok(parsed.data);
}

function importBatchInProgress(batch: {
	id: string;
	status: ImportBatchStatus;
	leaseExpiresAt: Date | null;
}): Result<never> {
	return fail("CONFLICT", "Import batch is currently being processed", {
		reason: "MASTER_INVALID_STATE",
		errorCode: "MASTER_DATA_INVALID_STATE",
		batchId: batch.id,
		batchStatus: batch.status,
		leaseExpiresAt: batch.leaseExpiresAt?.toISOString() ?? null,
	} satisfies MasterFailureDetails);
}

function importBatchCompletionStatus(
	report: ImportReconciliationReport,
): "partially_applied" | "applied" | "failed" {
	const failed = report.rejected + report.conflicted;
	if (failed === 0) return "applied";
	const succeeded = report.created + report.updated + report.unchanged;
	return succeeded === 0 ? "failed" : "partially_applied";
}

const partyImportRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	partyKind: z.enum(PARTY_KINDS),
	expectedVersion: expectedVersionSchema.optional(),
	externalId: z
		.object({
			sourceSystem: z.string().trim().min(1).max(64),
			externalIdType: z.string().trim().min(1).max(64),
			externalValue: z.string().trim().min(1).max(256),
			caseSensitivity: z.enum(["sensitive", "insensitive"]),
		})
		.optional(),
});

const itemGroupImportRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	expectedVersion: expectedVersionSchema.optional(),
});

const itemImportRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	itemType: z.enum(ITEM_TYPES),
	baseUomId: refUomIdSchema,
	itemGroupId: itemGroupIdSchema,
	expectedVersion: expectedVersionSchema.optional(),
});

const warehouseImportRowSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	locationType: z.enum(WAREHOUSE_LOCATION_TYPES),
	expectedVersion: expectedVersionSchema.optional(),
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
	rows: readonly Pick<ImportRowResultDraft, "outcome">[],
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

function toImportPayload(row: unknown): ImportReportPayload {
	if (typeof row !== "object" || row === null || Array.isArray(row)) {
		return { value: row };
	}
	return { ...row };
}

function normalizeImportReportPayload(input: {
	rawPayload: ImportReportPayload;
	code: string;
}): ImportReportPayload {
	const normalizedCode = normalizeMasterCode(input.code);
	if (!normalizedCode.ok) {
		return input.rawPayload;
	}
	return {
		...input.rawPayload,
		code: normalizedCode.data.code,
		normalizedCode: normalizedCode.data.normalizedCode,
	};
}

function intendedOperationForRow(
	row: Pick<ImportRowResultDraft, "outcome" | "entityId">,
): ImportRowResult["intendedOperation"] {
	switch (row.outcome) {
		case "create":
			return "create";
		case "update":
			return "update";
		case "unchanged":
			return "skip";
		case "rejected":
		case "conflict":
			return row.entityId === undefined ? "reject" : "update";
		default:
			return assertNever(row.outcome);
	}
}

function validationErrorsForRow(
	row: Pick<ImportRowResultDraft, "outcome" | "message" | "reason">,
): string[] {
	if (row.outcome !== "rejected" && row.outcome !== "conflict") {
		return [];
	}
	return [row.reason, row.message].filter(
		(value): value is string => value !== undefined && value.trim().length > 0,
	);
}

function completeImportRows<TRow>(
	rows: readonly ImportRowResultDraft[],
	sourceRows: readonly TRow[],
): ImportRowResult[] {
	return rows.map((row) => {
		const sourceRow = sourceRows[row.rowIndex];
		const rawPayload = toImportPayload(sourceRow);
		const matchedTargetId =
			row.matchedTargetId !== undefined
				? row.matchedTargetId
				: row.outcome === "update" ||
						row.outcome === "unchanged" ||
						row.outcome === "conflict"
					? (row.entityId ?? null)
					: null;
		return {
			rowIndex: row.rowIndex,
			sourceRowNumber: row.rowIndex + 1,
			code: row.code,
			outcome: row.outcome,
			rawPayload,
			normalizedPayload: normalizeImportReportPayload({
				rawPayload,
				code: row.code,
			}),
			matchedTargetId,
			intendedOperation: intendedOperationForRow(row),
			validationErrors: validationErrorsForRow(row),
			applicationResult: {
				outcome: row.outcome,
				message: row.message ?? null,
				reason: row.reason ?? null,
			},
			resultingEntityId: row.entityId ?? null,
			resultingEntityVersion: row.entityVersion ?? null,
			...(row.entityId !== undefined ? { entityId: row.entityId } : {}),
			...(row.message !== undefined ? { message: row.message } : {}),
			...(row.reason !== undefined ? { reason: row.reason } : {}),
		};
	});
}

function modeBlocksCreate(
	mode: ImportMode,
	rowIndex: number,
	code: string,
): ImportRowResultDraft | null {
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
): ImportRowResultDraft | null {
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
		operationType: "upsert_party_by_code",
		rows: ctx.rows,
		run: async (execution) => upsertPartiesByCodeBody(ctx, options, execution),
	});
}

async function upsertPartiesByCodeBody(
	ctx: z.infer<typeof upsertPartiesByCodeInputSchema>,
	options: MasterCommandOptions,
	execution?: ImportExecutionContext,
): Promise<Result<ImportReconciliationReport>> {
	const { store, authorization } = resolveCommandDeps(options);
	const resumed = resumedAppliedResults(execution, ctx.rows);
	const results: ImportRowResultDraft[] = [...resumed.results];

	const normalizedRows: Array<{
		rowIndex: number;
		normalizedCode: string;
		code: string;
		row: z.infer<typeof partyImportRowSchema>;
	}> = [];

	for (let rowIndex = 0; rowIndex < ctx.rows.length; rowIndex += 1) {
		if (resumed.rowIndexes.has(rowIndex)) continue;
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
					sourceSystem: entry.row.externalId.sourceSystem,
					externalIdType: entry.row.externalId.externalIdType,
					externalValue: entry.row.externalId.externalValue,
					caseSensitivity: entry.row.externalId.caseSensitivity,
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
			const importExternalIds: NonNullable<
				NonNullable<MasterCommandOptions["importMutation"]>["partyExternalIds"]
			>[number][] = [];
			if (entry.row.externalId !== undefined) {
				const normalizedExternalId = normalizeExternalId(entry.row.externalId);
				if (!normalizedExternalId.ok) {
					results.push({
						rowIndex: entry.rowIndex,
						code: entry.code,
						outcome: "rejected",
						message: normalizedExternalId.message,
						reason: "MASTER_VALIDATION_FAILED",
					});
					continue;
				}
				const externalIdAuthorized = await requireMasterCommandPermission(
					authorization,
					{
						organizationId: ctx.organizationId,
						actorUserId: ctx.actorUserId,
						command: isRegulatoryExternalIdType(
							normalizedExternalId.data.externalIdType,
						)
							? MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE_REGULATORY
							: MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE,
					},
				);
				if (!externalIdAuthorized.ok) {
					results.push({
						rowIndex: entry.rowIndex,
						code: entry.code,
						outcome: "rejected",
						message: externalIdAuthorized.message,
					});
					continue;
				}
				importExternalIds.push({
					id: randomUUID(),
					...normalizedExternalId.data,
					isPrimary: false,
					createdBy: ctx.actorUserId,
				});
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
				importMutationOptions(options, {
					execution,
					organizationId: ctx.organizationId,
					rowIndex: entry.rowIndex,
					intendedOperation: "create",
					matchedEntityId: null,
					partyExternalIds: importExternalIds,
				}),
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
			results.push({
				rowIndex: entry.rowIndex,
				code: entry.code,
				outcome: "create",
				entityId: created.data.id,
				...(created.data.version !== undefined
					? { entityVersion: created.data.version }
					: {}),
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
				entityVersion: current.version,
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
			importMutationOptions(options, {
				execution,
				organizationId: ctx.organizationId,
				rowIndex: entry.rowIndex,
				intendedOperation: "update",
				matchedEntityId: current.id,
			}),
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
			...(updated.data.version !== undefined
				? { entityVersion: updated.data.version }
				: {}),
		});
	}

	results.sort((a, b) => a.rowIndex - b.rowIndex);
	return ok({
		sourceSystem: ctx.sourceSystem,
		dryRun: ctx.dryRun,
		mode: ctx.mode,
		organizationId: ctx.organizationId,
		...summarize(results),
		rows: completeImportRows(results, ctx.rows),
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
		approvedByActorUserId?: string;
		requireSegregatedApproval?: boolean;
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
		create: (
			row: TRow,
			code: string,
			commandOptions: MasterCommandOptions,
		) => Promise<Result<{ id: string; version?: number }>>;
		update: (
			row: TRow,
			existing: { id: string; version: number },
			commandOptions: MasterCommandOptions,
		) => Promise<Result<{ id: string; version?: number }>>;
		isUnchanged: (existing: { name: string }, row: TRow) => boolean;
		/** Reject when row tries to change fields outside the mutable allowlist. */
		rejectImmutable?: (
			existing: { id: string; name: string; version: number },
			row: TRow,
			rowIndex: number,
			code: string,
		) => ImportRowResultDraft | null;
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
		operationType: `upsert_${input.entityType}_by_code`,
		rows: input.rows,
		run: async (execution) =>
			upsertByCodeGenericBody(input, options, handlers, execution),
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
	options: MasterCommandOptions,
	handlers: {
		getByCode: (
			organizationId: string,
			normalizedCode: string,
		) => Promise<Result<{ id: string; name: string; version: number } | null>>;
		create: (
			row: TRow,
			code: string,
			commandOptions: MasterCommandOptions,
		) => Promise<Result<{ id: string; version?: number }>>;
		update: (
			row: TRow,
			existing: { id: string; version: number },
			commandOptions: MasterCommandOptions,
		) => Promise<Result<{ id: string; version?: number }>>;
		isUnchanged: (existing: { name: string }, row: TRow) => boolean;
		rejectImmutable?: (
			existing: { id: string; name: string; version: number },
			row: TRow,
			rowIndex: number,
			code: string,
		) => ImportRowResultDraft | null;
	},
	execution?: ImportExecutionContext,
): Promise<Result<ImportReconciliationReport>> {
	const resumed = resumedAppliedResults(execution, input.rows);
	const results: ImportRowResultDraft[] = [...resumed.results];
	const normalizedRows: Array<{
		rowIndex: number;
		normalizedCode: string;
		code: string;
		row: TRow;
	}> = [];

	for (let rowIndex = 0; rowIndex < input.rows.length; rowIndex += 1) {
		if (resumed.rowIndexes.has(rowIndex)) continue;
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
			const created = await handlers.create(
				entry.row,
				entry.code,
				importMutationOptions(options, {
					execution,
					organizationId: input.organizationId,
					rowIndex: entry.rowIndex,
					intendedOperation: "create",
					matchedEntityId: null,
				}),
			);
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
				entityVersion: created.data.version,
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
				entityVersion: current.version,
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
		const updated = await handlers.update(
			entry.row,
			current,
			importMutationOptions(options, {
				execution,
				organizationId: input.organizationId,
				rowIndex: entry.rowIndex,
				intendedOperation: "update",
				matchedEntityId: current.id,
			}),
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
			entityVersion: updated.data.version,
		});
	}

	results.sort((a, b) => a.rowIndex - b.rowIndex);
	return ok({
		sourceSystem: input.sourceSystem,
		dryRun: input.dryRun,
		mode: input.mode,
		organizationId: input.organizationId,
		...summarize(results),
		rows: completeImportRows(results, input.rows),
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
	return upsertByCodeGeneric({ ...ctx, entityType: "item_group" }, options, {
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
		create: async (row, code, commandOptions) =>
			createItemGroup(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					code,
					name: row.name,
				},
				commandOptions,
			),
		update: async (row, existing, commandOptions) =>
			updateItemGroup(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					id: existing.id,
					expectedVersion: existing.version,
					name: row.name,
				},
				commandOptions,
			),
		isUnchanged: (existing, row) => existing.name === row.name,
	});
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
		create: async (row, code, commandOptions) =>
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
				commandOptions,
			),
		update: async (row, existing, commandOptions) =>
			updateItem(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					id: existing.id,
					expectedVersion: existing.version,
					name: row.name,
				},
				commandOptions,
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
		create: async (row, code, commandOptions) =>
			createWarehouse(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					code,
					name: row.name,
					locationType: row.locationType,
				},
				commandOptions,
			),
		update: async (row, existing, commandOptions) =>
			updateWarehouse(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					id: existing.id,
					expectedVersion: existing.version,
					name: row.name,
				},
				commandOptions,
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
					message: "locationType is immutable on import; only name may update",
					reason: "MASTER_VALIDATION_FAILED",
				};
			}
			return null;
		},
	});
}

/** Validate-only alias — dry-run party upsert (`master_data.import_validate`). */
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

function assertNever(value: never): never {
	throw new Error(`Unsupported import row outcome: ${String(value)}`);
}
