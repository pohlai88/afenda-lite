import {
	database as afendaDatabase,
	and,
	eq,
	inArray,
	payrollRetroItem,
	payrollRetroLine,
	sql,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";

import {
	isPostgresUniqueViolation,
	mapConflict,
	mapPersistenceFailure,
} from "../../kernel/execution/persistence-errors";
import type {
	PayrollRetroItem,
	PayrollRetroItemView,
	PayrollRetroLine,
} from "./contract";
import {
	payrollRetroCorrectionSchema,
	payrollRetroDifferenceSchema,
	payrollRetroLineKindSchema,
	payrollRetroRuleKindSchema,
	payrollRetroStatusSchema,
} from "./retro.schema";
import type { PayrollRetroStore } from "./retro.store";

function mapItem(
	row: typeof payrollRetroItem.$inferSelect,
): Result<PayrollRetroItem> {
	const status = payrollRetroStatusSchema.safeParse(row.status);
	const correction = payrollRetroCorrectionSchema.safeParse(row.correctionJson);
	if (!(status.success && correction.success)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	let difference: PayrollRetroItem["difference"] = null;
	if (row.differenceJson !== null) {
		const parsed = payrollRetroDifferenceSchema.safeParse(row.differenceJson);
		if (!parsed.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		difference = parsed.data;
	}
	return errorResult.ok({
		appliedAt: row.appliedAt,
		correction: correction.data,
		correlationId: row.correlationId,
		createdAt: row.createdAt,
		createdBy: row.createdBy,
		difference,
		employeeId: row.employeeId,
		id: row.id,
		idempotencyKey: row.createIdempotencyKey,
		organizationId: row.organizationId,
		originPeriodId: row.originPeriodId,
		originRunId: row.originRunId,
		reason: row.reason,
		requestFingerprint: row.createRequestFingerprint,
		status: status.data,
		targetPeriodId: row.targetPeriodId,
		targetRunId: row.targetRunId,
		updatedAt: row.updatedAt,
		updatedBy: row.updatedBy,
		version: row.version,
	});
}

function mapLine(
	row: typeof payrollRetroLine.$inferSelect,
): Result<PayrollRetroLine> {
	const lineKind = payrollRetroLineKindSchema.safeParse(row.lineKind);
	const ruleKind = payrollRetroRuleKindSchema.safeParse(row.ruleKind);
	if (!(lineKind.success && ruleKind.success)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		amount: row.amount,
		code: row.code,
		createdAt: row.createdAt,
		currencyCode: row.currencyCode,
		employeeId: row.employeeId,
		id: row.id,
		lineKind: lineKind.data,
		organizationId: row.organizationId,
		originPeriodId: row.originPeriodId,
		originRunId: row.originRunId,
		retroItemId: row.retroItemId,
		ruleCode: row.ruleCode,
		ruleKind: ruleKind.data,
		ruleVersion: row.ruleVersion,
		sequence: row.sequence,
		targetRunId: row.targetRunId,
	});
}

export const drizzleRetroMethods: PayrollRetroStore = {
	async createRetroItem(input) {
		const { item } = input;
		try {
			await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					INSERT INTO payroll_retro_item (
						id, organization_id, origin_period_id, origin_run_id, employee_id,
						status, reason, correlation_id, correction_json, difference_json,
						target_period_id, target_run_id, applied_at,
						create_idempotency_key, create_request_fingerprint,
						version, created_by, updated_by, created_at, updated_at
					) VALUES (
						${item.id}::uuid, ${item.organizationId},
						${item.originPeriodId}::uuid, ${item.originRunId},
						${item.employeeId}, ${item.status}, ${item.reason},
						${item.correlationId}, ${JSON.stringify(item.correction)}::jsonb,
						${item.difference === null ? null : JSON.stringify(item.difference)}::jsonb,
						${item.targetPeriodId}, ${item.targetRunId}, ${item.appliedAt},
						${item.idempotencyKey}, ${item.requestFingerprint},
						${item.version}, ${item.createdBy}, ${item.updatedBy},
						${item.createdAt}, ${item.updatedAt}
					)
				`,
			]);
			return errorResult.ok(item);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return mapConflict("Idempotency key conflict");
			}
			return mapPersistenceFailure(error, "Failed to queue payroll retro item");
		}
	},

	async findRetroItemByIdempotencyKey(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollRetroItem)
				.where(
					and(
						eq(payrollRetroItem.organizationId, input.organizationId),
						eq(payrollRetroItem.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			return row === undefined ? errorResult.ok(null) : mapItem(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll retro item");
		}
	},

	async getRetroItem(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollRetroItem)
				.where(
					and(
						eq(payrollRetroItem.organizationId, input.organizationId),
						eq(payrollRetroItem.id, input.retroItemId),
					),
				)
				.limit(1);
			return row === undefined ? errorResult.ok(null) : mapItem(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll retro item");
		}
	},

	async listRetroItemViews(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(payrollRetroItem)
				.where(
					and(
						eq(payrollRetroItem.organizationId, input.organizationId),
						input.employeeId === undefined
							? sql`true`
							: eq(payrollRetroItem.employeeId, input.employeeId),
						input.originPeriodId === undefined
							? sql`true`
							: eq(payrollRetroItem.originPeriodId, input.originPeriodId),
						input.status === undefined
							? sql`true`
							: eq(payrollRetroItem.status, input.status),
						input.targetRunId === undefined
							? sql`true`
							: eq(payrollRetroItem.targetRunId, input.targetRunId),
					),
				)
				.orderBy(payrollRetroItem.id);

			const items: PayrollRetroItem[] = [];
			for (const row of rows) {
				const mapped = mapItem(row);
				if (!mapped.ok) {
					return mapped;
				}
				items.push(mapped.data);
			}
			if (items.length === 0) {
				return errorResult.ok([]);
			}

			const lineRows = await afendaDatabase.client
				.select()
				.from(payrollRetroLine)
				.where(
					and(
						eq(payrollRetroLine.organizationId, input.organizationId),
						inArray(
							payrollRetroLine.retroItemId,
							items.map((item) => item.id),
						),
					),
				)
				.orderBy(payrollRetroLine.sequence);

			const linesByItem = new Map<string, PayrollRetroLine[]>();
			for (const row of lineRows) {
				const mapped = mapLine(row);
				if (!mapped.ok) {
					return mapped;
				}
				const bucket = linesByItem.get(mapped.data.retroItemId) ?? [];
				bucket.push(mapped.data);
				linesByItem.set(mapped.data.retroItemId, bucket);
			}

			return errorResult.ok(
				items.map(
					(item): PayrollRetroItemView => ({
						item,
						lines: linesByItem.get(item.id) ?? [],
					}),
				),
			);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list payroll retro items");
		}
	},

	async saveRetroDifference(input) {
		const { item } = input;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					UPDATE payroll_retro_item
					SET
						status = ${item.status},
						origin_run_id = ${item.originRunId}::uuid,
						difference_json = ${
							item.difference === null ? null : JSON.stringify(item.difference)
						}::jsonb,
						version = ${item.version},
						updated_by = ${item.updatedBy},
						updated_at = ${item.updatedAt}
					WHERE organization_id = ${item.organizationId}
						AND id = ${item.id}::uuid
						AND version = ${input.expectedVersion}
					RETURNING id
				`,
			]);
			if (rows.length === 0) {
				return mapConflict("Retro item version conflict");
			}
			return errorResult.ok(input.item);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to save payroll retro difference",
			);
		}
	},

	async applyRetroItem(input) {
		try {
			// One statement keeps the item transition and its retro lines atomic.
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					WITH item_updated AS (
						UPDATE payroll_retro_item
						SET
							status = ${input.item.status},
							target_period_id = ${input.item.targetPeriodId}::uuid,
							target_run_id = ${input.item.targetRunId}::uuid,
							applied_at = ${input.item.appliedAt},
							version = ${input.item.version},
							updated_by = ${input.item.updatedBy},
							updated_at = ${input.item.updatedAt}
						WHERE organization_id = ${input.item.organizationId}
							AND id = ${input.item.id}::uuid
							AND version = ${input.expectedVersion}
						RETURNING id
					),
					lines_inserted AS (
						INSERT INTO payroll_retro_line (
							id, organization_id, retro_item_id, target_run_id,
							origin_period_id, origin_run_id, employee_id, line_kind, code,
							rule_code, rule_version, rule_kind, amount, currency_code,
							sequence, created_at
						)
						SELECT
							(entry->>'id')::uuid,
							entry->>'organizationId',
							(entry->>'retroItemId')::uuid,
							(entry->>'targetRunId')::uuid,
							(entry->>'originPeriodId')::uuid,
							(entry->>'originRunId')::uuid,
							entry->>'employeeId',
							entry->>'lineKind',
							entry->>'code',
							entry->>'ruleCode',
							entry->>'ruleVersion',
							entry->>'ruleKind',
							(entry->>'amount')::numeric,
							entry->>'currencyCode',
							(entry->>'sequence')::integer,
							(entry->>'createdAt')::timestamptz
						FROM jsonb_array_elements(${JSON.stringify(input.lines)}::jsonb) AS entry
						WHERE EXISTS (SELECT 1 FROM item_updated)
						RETURNING id
					)
					SELECT id FROM item_updated
				`,
			]);
			if (rows.length === 0) {
				return mapConflict("Retro item version conflict");
			}
			return errorResult.ok(input.item);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return mapConflict("Retro line conflict");
			}
			return mapPersistenceFailure(error, "Failed to apply payroll retro item");
		}
	},
};
