import {
	database as afendaDatabase,
	and,
	eq,
	payrollFinalSettlement,
	payrollFinalSettlementLine,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";

import {
	isPostgresUniqueViolation,
	mapConflict,
	mapPersistenceFailure,
} from "../../kernel/execution/persistence-errors";
import type {
	PayrollFinalSettlement,
	PayrollFinalSettlementLine,
} from "./contract";
import {
	payrollFinalSettlementCompensationSnapshotSchema,
	payrollFinalSettlementFactsSchema,
	payrollFinalSettlementLineKindSchema,
	payrollFinalSettlementStatusSchema,
	payrollFinalSettlementStatutoryEvidenceSchema,
	payrollFinalSettlementTotalsSchema,
} from "./settlement.schema";
import type { PayrollFinalSettlementStore } from "./settlement.store";

function mapSettlement(
	row: typeof payrollFinalSettlement.$inferSelect,
): Result<PayrollFinalSettlement> {
	const status = payrollFinalSettlementStatusSchema.safeParse(row.status);
	const facts = payrollFinalSettlementFactsSchema.safeParse(row.factsJson);
	const compensationSnapshot =
		payrollFinalSettlementCompensationSnapshotSchema.safeParse(
			row.compensationSnapshotJson,
		);
	if (!(status.success && facts.success && compensationSnapshot.success)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	let totals: PayrollFinalSettlement["totals"] = null;
	if (row.totalsJson !== null) {
		const parsed = payrollFinalSettlementTotalsSchema.safeParse(row.totalsJson);
		if (!parsed.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		totals = parsed.data;
	}
	let statutoryEvidence: PayrollFinalSettlement["statutoryEvidence"] = null;
	if (row.statutoryEvidenceJson !== null) {
		const parsed = payrollFinalSettlementStatutoryEvidenceSchema.safeParse(
			row.statutoryEvidenceJson,
		);
		if (!parsed.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		statutoryEvidence = parsed.data;
	}
	return errorResult.ok({
		calculatedAt: row.calculatedAt,
		calculatedBy: row.calculatedBy,
		clearanceAt: row.clearanceAt,
		clearanceBy: row.clearanceBy,
		clearanceReason: row.clearanceReason,
		clearanceRequiredReason: row.clearanceRequiredReason,
		compensationSnapshot: compensationSnapshot.data,
		compensationSnapshotHash: row.compensationSnapshotHash,
		correlationId: row.correlationId,
		createdAt: row.createdAt,
		createdBy: row.createdBy,
		employeeId: row.employeeId,
		facts: facts.data,
		finalizedAt: row.finalizedAt,
		finalizedBy: row.finalizedBy,
		id: row.id,
		idempotencyKey: row.createIdempotencyKey,
		organizationId: row.organizationId,
		originRunId: row.originRunId,
		payGroupId: row.payGroupId,
		periodId: row.periodId,
		requestFingerprint: row.createRequestFingerprint,
		statutoryEvidence,
		status: status.data,
		terminationEffectiveOn: row.terminationEffectiveOn,
		terminationId: row.terminationId,
		totals,
		updatedAt: row.updatedAt,
		updatedBy: row.updatedBy,
		version: row.version,
	});
}

function mapLine(
	row: typeof payrollFinalSettlementLine.$inferSelect,
): Result<PayrollFinalSettlementLine> {
	const kind = payrollFinalSettlementLineKindSchema.safeParse(row.kind);
	if (!kind.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		amount: row.amount,
		code: row.code,
		createdAt: row.createdAt,
		currencyCode: row.currencyCode,
		id: row.id,
		kind: kind.data,
		organizationId: row.organizationId,
		sequence: row.sequence,
		settlementId: row.settlementId,
	});
}

export const drizzleFinalSettlementMethods: PayrollFinalSettlementStore = {
	async createFinalSettlement(input) {
		const { settlement } = input;
		try {
			await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					INSERT INTO payroll_final_settlement (
						id, organization_id, employee_id, termination_id,
						termination_effective_on, period_id, pay_group_id, origin_run_id,
						status, facts_json, compensation_snapshot_json,
						compensation_snapshot_hash, totals_json, statutory_evidence_json,
						clearance_required_reason, clearance_reason, clearance_by,
						clearance_at, calculated_by, calculated_at, finalized_by,
						finalized_at, correlation_id, create_idempotency_key,
						create_request_fingerprint, version, created_by, updated_by,
						created_at, updated_at
					) VALUES (
						${settlement.id}::uuid, ${settlement.organizationId},
						${settlement.employeeId}, ${settlement.terminationId},
						${settlement.terminationEffectiveOn}, ${settlement.periodId}::uuid,
						${settlement.payGroupId}::uuid, ${settlement.originRunId},
						${settlement.status}, ${JSON.stringify(settlement.facts)}::jsonb,
						${JSON.stringify(settlement.compensationSnapshot)}::jsonb,
						${settlement.compensationSnapshotHash},
						${settlement.totals === null ? null : JSON.stringify(settlement.totals)}::jsonb,
						${settlement.statutoryEvidence === null ? null : JSON.stringify(settlement.statutoryEvidence)}::jsonb,
						${settlement.clearanceRequiredReason}, ${settlement.clearanceReason},
						${settlement.clearanceBy}, ${settlement.clearanceAt},
						${settlement.calculatedBy}, ${settlement.calculatedAt},
						${settlement.finalizedBy}, ${settlement.finalizedAt},
						${settlement.correlationId}, ${settlement.idempotencyKey},
						${settlement.requestFingerprint}, ${settlement.version},
						${settlement.createdBy}, ${settlement.updatedBy},
						${settlement.createdAt}, ${settlement.updatedAt}
					)
				`,
			]);
			return errorResult.ok(settlement);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return mapConflict("Idempotency key conflict");
			}
			return mapPersistenceFailure(
				error,
				"Failed to initiate payroll final settlement",
			);
		}
	},

	async findFinalSettlementByIdempotencyKey(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollFinalSettlement)
				.where(
					and(
						eq(payrollFinalSettlement.organizationId, input.organizationId),
						eq(
							payrollFinalSettlement.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			return row === undefined ? errorResult.ok(null) : mapSettlement(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll final settlement",
			);
		}
	},

	async getFinalSettlement(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollFinalSettlement)
				.where(
					and(
						eq(payrollFinalSettlement.organizationId, input.organizationId),
						eq(payrollFinalSettlement.id, input.settlementId),
					),
				)
				.limit(1);
			return row === undefined ? errorResult.ok(null) : mapSettlement(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll final settlement",
			);
		}
	},

	async listFinalSettlementLines(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(payrollFinalSettlementLine)
				.where(
					and(
						eq(payrollFinalSettlementLine.organizationId, input.organizationId),
						eq(payrollFinalSettlementLine.settlementId, input.settlementId),
					),
				)
				.orderBy(payrollFinalSettlementLine.sequence);
			const lines: PayrollFinalSettlementLine[] = [];
			for (const row of rows) {
				const mapped = mapLine(row);
				if (!mapped.ok) {
					return mapped;
				}
				lines.push(mapped.data);
			}
			return errorResult.ok(lines);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll final settlement lines",
			);
		}
	},

	async saveFinalSettlementCalculation(input) {
		const { settlement } = input;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					WITH settlement_updated AS (
						UPDATE payroll_final_settlement
						SET
							status = ${settlement.status},
							totals_json = ${JSON.stringify(settlement.totals)}::jsonb,
							statutory_evidence_json = ${
								settlement.statutoryEvidence === null
									? null
									: JSON.stringify(settlement.statutoryEvidence)
							}::jsonb,
							clearance_reason = ${settlement.clearanceReason},
							clearance_by = ${settlement.clearanceBy},
							clearance_at = ${settlement.clearanceAt},
							calculated_by = ${settlement.calculatedBy},
							calculated_at = ${settlement.calculatedAt},
							version = ${settlement.version},
							updated_by = ${settlement.updatedBy},
							updated_at = ${settlement.updatedAt}
						WHERE organization_id = ${settlement.organizationId}
							AND id = ${settlement.id}::uuid
							AND version = ${input.expectedVersion}
						RETURNING id
					),
					lines_deleted AS (
						DELETE FROM payroll_final_settlement_line
						WHERE organization_id = ${settlement.organizationId}
							AND settlement_id = ${settlement.id}::uuid
							AND EXISTS (SELECT 1 FROM settlement_updated)
						RETURNING id
					),
					lines_inserted AS (
						INSERT INTO payroll_final_settlement_line (
							id, organization_id, settlement_id, kind, code, amount,
							currency_code, sequence, created_at
						)
						SELECT
							(entry->>'id')::uuid,
							entry->>'organizationId',
							(entry->>'settlementId')::uuid,
							entry->>'kind',
							entry->>'code',
							(entry->>'amount')::numeric,
							entry->>'currencyCode',
							(entry->>'sequence')::integer,
							(entry->>'createdAt')::timestamptz
						FROM jsonb_array_elements(${JSON.stringify(input.lines)}::jsonb) AS entry
						WHERE EXISTS (SELECT 1 FROM settlement_updated)
						RETURNING id
					)
					SELECT id FROM settlement_updated
				`,
			]);
			if (rows.length === 0) {
				return mapConflict("Final settlement version conflict");
			}
			return errorResult.ok(settlement);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return mapConflict("Final settlement line conflict");
			}
			return mapPersistenceFailure(
				error,
				"Failed to calculate payroll final settlement",
			);
		}
	},

	async saveFinalSettlementTransition(input) {
		const { settlement } = input;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					UPDATE payroll_final_settlement
					SET
						status = ${settlement.status},
						finalized_by = ${settlement.finalizedBy},
						finalized_at = ${settlement.finalizedAt},
						version = ${settlement.version},
						updated_by = ${settlement.updatedBy},
						updated_at = ${settlement.updatedAt}
					WHERE organization_id = ${settlement.organizationId}
						AND id = ${settlement.id}::uuid
						AND version = ${input.expectedVersion}
					RETURNING id
				`,
			]);
			if (rows.length === 0) {
				return mapConflict("Final settlement version conflict");
			}
			return errorResult.ok(settlement);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to update payroll final settlement",
			);
		}
	},
};
