import {
	database as afendaDatabase,
	and,
	eq,
	payrollStatutoryFiling,
	payrollStatutoryFilingLine,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";

import {
	isPostgresUniqueViolation,
	mapConflict,
	mapPersistenceFailure,
} from "../../kernel/execution/persistence-errors";
import type {
	PayrollFilingObligation,
	PayrollStatutoryFiling,
	PayrollStatutoryFilingEvidence,
	PayrollStatutoryFilingLine,
} from "./contract";
import {
	payrollStatutoryFilingKindSchema,
	payrollStatutoryFilingStatusSchema,
} from "./filing.schema";
import type { PayrollStatutoryFilingStore } from "./filing.store";

function mapFiling(
	row: typeof payrollStatutoryFiling.$inferSelect,
): Result<PayrollStatutoryFiling> {
	const kind = payrollStatutoryFilingKindSchema.safeParse(row.kind);
	const status = payrollStatutoryFilingStatusSchema.safeParse(row.status);
	if (!(kind.success && status.success)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const totals = row.totalsJson as PayrollStatutoryFiling["totals"];
	const sourceRunIds = row.sourceRunIdsJson as string[];
	let evidence: PayrollStatutoryFilingEvidence | null = null;
	if (row.evidenceJson !== null) {
		evidence = row.evidenceJson as PayrollStatutoryFilingEvidence;
	}
	return errorResult.ok({
		correlationId: row.correlationId,
		createdAt: row.createdAt,
		createdBy: row.createdBy,
		employeeId: row.employeeId,
		evidence,
		id: row.id,
		idempotencyKey: row.createIdempotencyKey,
		instrumentCode: row.instrumentCode,
		jurisdictionCode: row.jurisdictionCode,
		kind: kind.data,
		organizationId: row.organizationId,
		periodId: row.periodId,
		requestFingerprint: row.createRequestFingerprint,
		sealedAt: row.sealedAt,
		sealedBy: row.sealedBy,
		sourceRunIds,
		status: status.data,
		taxYear: row.taxYear,
		totals,
		updatedAt: row.updatedAt,
		updatedBy: row.updatedBy,
		version: row.version,
	});
}

function mapLine(
	row: typeof payrollStatutoryFilingLine.$inferSelect,
): PayrollStatutoryFilingLine {
	return {
		baseAmount: row.baseAmount,
		calculatorId: row.calculatorId,
		createdAt: row.createdAt,
		currencyCode: row.currencyCode,
		employeeAmount: row.employeeAmount,
		employeeId: row.employeeId,
		employerAmount: row.employerAmount,
		filingId: row.filingId,
		id: row.id,
		organizationId: row.organizationId,
		ruleCode: row.ruleCode,
		ruleVersion: row.ruleVersion,
		runId: row.runId,
		sequence: row.sequence,
	};
}

export const drizzleStatutoryFilingMethods: PayrollStatutoryFilingStore = {
	async createStatutoryFiling(input) {
		const { filing, lines } = input;
		try {
			await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					INSERT INTO payroll_statutory_filing (
						id, organization_id, kind, jurisdiction_code, instrument_code,
						period_id, tax_year, employee_id, status, source_run_ids_json,
						totals_json, evidence_json, sealed_by, sealed_at, correlation_id,
						create_idempotency_key, create_request_fingerprint, version,
						created_by, updated_by, created_at, updated_at
					) VALUES (
						${filing.id}::uuid, ${filing.organizationId}, ${filing.kind},
						${filing.jurisdictionCode}, ${filing.instrumentCode},
						${filing.periodId}, ${filing.taxYear}, ${filing.employeeId},
						${filing.status}, ${JSON.stringify(filing.sourceRunIds)}::jsonb,
						${JSON.stringify(filing.totals)}::jsonb,
						${filing.evidence === null ? null : JSON.stringify(filing.evidence)}::jsonb,
						${filing.sealedBy}, ${filing.sealedAt}, ${filing.correlationId},
						${filing.idempotencyKey}, ${filing.requestFingerprint}, ${filing.version},
						${filing.createdBy}, ${filing.updatedBy}, ${filing.createdAt},
						${filing.updatedAt}
					)
				`,
				sqlValue`
					INSERT INTO payroll_statutory_filing_line (
						id, organization_id, filing_id, run_id, employee_id, rule_code,
						rule_version, calculator_id, base_amount, employee_amount,
						employer_amount, currency_code, sequence, created_at
					)
					SELECT
						(entry->>'id')::uuid,
						entry->>'organizationId',
						(entry->>'filingId')::uuid,
						(entry->>'runId')::uuid,
						entry->>'employeeId',
						entry->>'ruleCode',
						entry->>'ruleVersion',
						entry->>'calculatorId',
						(entry->>'baseAmount')::numeric,
						(entry->>'employeeAmount')::numeric,
						(entry->>'employerAmount')::numeric,
						entry->>'currencyCode',
						(entry->>'sequence')::integer,
						(entry->>'createdAt')::timestamptz
					FROM jsonb_array_elements(${JSON.stringify(lines)}::jsonb) AS entry
				`,
			]);
			return errorResult.ok(filing);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return mapConflict("Statutory filing conflict");
			}
			return mapPersistenceFailure(error, "Failed to create statutory filing");
		}
	},

	async findStatutoryFilingByIdempotencyKey(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollStatutoryFiling)
				.where(
					and(
						eq(payrollStatutoryFiling.organizationId, input.organizationId),
						eq(
							payrollStatutoryFiling.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			return row === undefined ? errorResult.ok(null) : mapFiling(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load statutory filing");
		}
	},

	async getStatutoryFiling(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollStatutoryFiling)
				.where(
					and(
						eq(payrollStatutoryFiling.organizationId, input.organizationId),
						eq(payrollStatutoryFiling.id, input.filingId),
					),
				)
				.limit(1);
			return row === undefined ? errorResult.ok(null) : mapFiling(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load statutory filing");
		}
	},

	async listFilingObligations(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(payrollStatutoryFiling)
				.where(eq(payrollStatutoryFiling.organizationId, input.organizationId));
			const obligations: PayrollFilingObligation[] = [];
			for (const row of rows) {
				const mapped = mapFiling(row);
				if (!mapped.ok) {
					return mapped;
				}
				const filing = mapped.data;
				if (
					input.jurisdictionCode !== undefined &&
					filing.jurisdictionCode !== input.jurisdictionCode
				) {
					continue;
				}
				if (
					input.instrumentCode !== undefined &&
					filing.instrumentCode !== input.instrumentCode
				) {
					continue;
				}
				if (input.taxYear !== undefined && filing.taxYear !== input.taxYear) {
					continue;
				}
				obligations.push({
					employeeId: filing.employeeId,
					filingId: filing.id,
					instrumentCode: filing.instrumentCode,
					jurisdictionCode: filing.jurisdictionCode,
					kind: filing.kind,
					periodId: filing.periodId,
					status: filing.status,
					taxYear: filing.taxYear,
				});
			}
			return errorResult.ok(obligations);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list statutory filing obligations",
			);
		}
	},

	async listStatutoryFilingLines(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(payrollStatutoryFilingLine)
				.where(
					and(
						eq(payrollStatutoryFilingLine.organizationId, input.organizationId),
						eq(payrollStatutoryFilingLine.filingId, input.filingId),
					),
				)
				.orderBy(payrollStatutoryFilingLine.sequence);
			return errorResult.ok(rows.map(mapLine));
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list statutory filing lines",
			);
		}
	},

	async saveStatutoryFilingTransition(input) {
		const { filing } = input;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					UPDATE payroll_statutory_filing
					SET
						status = ${filing.status},
						evidence_json = ${
							filing.evidence === null ? null : JSON.stringify(filing.evidence)
						}::jsonb,
						sealed_by = ${filing.sealedBy},
						sealed_at = ${filing.sealedAt},
						version = ${filing.version},
						updated_by = ${filing.updatedBy},
						updated_at = ${filing.updatedAt}
					WHERE organization_id = ${filing.organizationId}
						AND id = ${filing.id}::uuid
						AND version = ${input.expectedVersion}
					RETURNING id
				`,
			]);
			if (rows.length === 0) {
				return mapConflict("Statutory filing version conflict");
			}
			return errorResult.ok(filing);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update statutory filing");
		}
	},
};
