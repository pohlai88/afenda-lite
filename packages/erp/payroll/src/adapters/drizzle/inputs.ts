import { randomUUID } from "node:crypto";

import {
	and,
	db,
	eq,
	payrollPeriod,
	payrollVariableInput,
} from "@afenda/db";
import { ok, type Result } from "@afenda/errors/result";

import {
	parsePayrollEarningRuleId,
	parsePayrollPayGroupId,
	parsePayrollPeriodId,
	parsePayrollVariableInputId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import { mapPersistenceFailure } from "../../shared/persistence-errors";
import {
	resolveCreateIdempotentReplay,
	resolveSourceIdempotentReplay,
} from "../../shared/source-idempotency";
import type { PayrollInputsStore } from "../../store/inputs";
import type {
	IdempotentPayrollVariableInputRecord,
	PayrollPeriod,
	PayrollVariableInput,
	PayrollVariableInputCreateRecord,
} from "../../types";

async function recordAudit(
	ports: MutationPorts,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
	},
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: [],
	});
}

function formatDecimal(value: string | null | undefined): string {
	if (value === null || value === undefined) {
		return "0";
	}
	return String(value);
}

function mapVariableInputRow(
	row: typeof payrollVariableInput.$inferSelect,
): Result<PayrollVariableInput> {
	const id = parsePayrollVariableInputId(row.id);
	const payGroupId = parsePayrollPayGroupId(row.payGroupId);
	const periodId = parsePayrollPeriodId(row.periodId);
	const earningRuleId = parsePayrollEarningRuleId(row.earningRuleId);
	if (!id.ok) {
		return id;
	}
	if (!payGroupId.ok) {
		return payGroupId;
	}
	if (!periodId.ok) {
		return periodId;
	}
	if (!earningRuleId.ok) {
		return earningRuleId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: row.employeeId,
		payGroupId: payGroupId.data,
		periodId: periodId.data,
		earningRuleId: earningRuleId.data,
		earningRuleCode: row.earningRuleCode,
		earningRuleVersion: row.earningRuleVersion,
		amount: formatDecimal(row.amount),
		currencyCode: row.currencyCode,
		sourceType: row.sourceType,
		sourceId: row.sourceId,
		status: row.status as PayrollVariableInput["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapIdempotentVariableInputRow(
	row: typeof payrollVariableInput.$inferSelect,
): Result<IdempotentPayrollVariableInputRecord> {
	const mapped = mapVariableInputRow(row);
	if (!mapped.ok) {
		return mapped;
	}
	return ok({
		variableInput: mapped.data,
		sourceRequestFingerprint: row.sourceRequestFingerprint,
		createRequestFingerprint: row.createRequestFingerprint,
	});
}

function mapPeriodRow(
	row: typeof payrollPeriod.$inferSelect,
): Result<PayrollPeriod> {
	const id = parsePayrollPeriodId(row.id);
	const payGroupId = parsePayrollPayGroupId(row.payGroupId);
	if (!id.ok) {
		return id;
	}
	if (!payGroupId.ok) {
		return payGroupId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		payGroupId: payGroupId.data,
		periodStart: row.periodStart,
		periodEnd: row.periodEnd,
		cutoffDate: row.cutoffDate,
		status: row.status as PayrollPeriod["status"],
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

export const drizzleInputsMethods: PayrollInputsStore = {
	async findVariableInputBySource(input) {
		try {
			const rows = await db
				.select()
				.from(payrollVariableInput)
				.where(
					and(
						eq(payrollVariableInput.organizationId, input.organizationId),
						eq(payrollVariableInput.sourceType, input.sourceType),
						eq(payrollVariableInput.sourceId, input.sourceId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapIdempotentVariableInputRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll variable input by source",
			);
		}
	},

	async findVariableInputByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(payrollVariableInput)
				.where(
					and(
						eq(payrollVariableInput.organizationId, input.organizationId),
						eq(
							payrollVariableInput.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapIdempotentVariableInputRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll variable input idempotency record",
			);
		}
	},

	async createVariableInput(record, ports) {
		const bySource = await this.findVariableInputBySource({
			organizationId: record.organizationId,
			sourceType: record.sourceType,
			sourceId: record.sourceId,
		});
		if (!bySource.ok) {
			return bySource;
		}
		const sourceReplay = resolveSourceIdempotentReplay({
			existing:
				bySource.data === null
					? null
					: {
							entity: bySource.data.variableInput,
							sourceRequestFingerprint: bySource.data.sourceRequestFingerprint,
						},
			requestFingerprint: record.sourceRequestFingerprint,
		});
		if (!sourceReplay.ok) {
			return sourceReplay;
		}
		if (sourceReplay.data !== "create") {
			return ok(sourceReplay.data);
		}

		const byIdempotency = await this.findVariableInputByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!byIdempotency.ok) {
			return byIdempotency;
		}
		const idempotencyReplay = resolveCreateIdempotentReplay({
			existing:
				byIdempotency.data === null
					? null
					: {
							entity: byIdempotency.data.variableInput,
							createRequestFingerprint:
								byIdempotency.data.createRequestFingerprint,
						},
			requestFingerprint: record.createRequestFingerprint,
		});
		if (!idempotencyReplay.ok) {
			return idempotencyReplay;
		}
		if (idempotencyReplay.data !== "create") {
			return ok(idempotencyReplay.data);
		}

		const variableInputId = parsePayrollVariableInputId(randomUUID());
		if (!variableInputId.ok) {
			return variableInputId;
		}

		try {
			const rows = await db
				.insert(payrollVariableInput)
				.values({
					id: variableInputId.data,
					organizationId: record.organizationId,
					employeeId: record.employeeId,
					payGroupId: record.payGroupId,
					periodId: record.periodId,
					earningRuleId: record.earningRuleId,
					earningRuleCode: record.earningRuleCode,
					earningRuleVersion: record.earningRuleVersion,
					amount: record.amount,
					currencyCode: record.currencyCode,
					sourceType: record.sourceType,
					sourceId: record.sourceId,
					sourceRequestFingerprint: record.sourceRequestFingerprint,
					status: "accepted",
					effectiveFrom: record.effectiveFrom,
					effectiveTo: record.effectiveTo ?? null,
					createIdempotencyKey: record.idempotencyKey,
					createRequestFingerprint: record.createRequestFingerprint,
					version: 1,
					createdBy: record.createdBy,
					updatedBy: record.createdBy,
				})
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return mapPersistenceFailure(
					new Error("Missing returning row"),
					"Failed to create payroll variable input",
				);
			}
			const mapped = mapVariableInputRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_variable_input",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				return audit;
			}
			return ok(mapped.data);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to create payroll variable input",
			);
		}
	},

	async getVariableInput(input) {
		try {
			const rows = await db
				.select()
				.from(payrollVariableInput)
				.where(
					and(
						eq(payrollVariableInput.organizationId, input.organizationId),
						eq(payrollVariableInput.id, input.variableInputId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapVariableInputRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll variable input",
			);
		}
	},

	async listVariableInputsForPeriod(input) {
		try {
			const rows = await db
				.select()
				.from(payrollVariableInput)
				.where(
					and(
						eq(payrollVariableInput.organizationId, input.organizationId),
						eq(payrollVariableInput.periodId, input.periodId),
					),
				);
			const variableInputs: PayrollVariableInput[] = [];
			for (const row of rows) {
				if (input.status !== undefined && row.status !== input.status) {
					continue;
				}
				const mapped = mapVariableInputRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				variableInputs.push(mapped.data);
			}
			return ok(variableInputs);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll variable inputs for period",
			);
		}
	},
};

export const drizzleInputPeriodLookup = {
	async getPeriod(input: {
		organizationId: string;
		periodId: import("../../brands").PayrollPeriodId;
	}): Promise<Result<PayrollPeriod | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollPeriod)
				.where(
					and(
						eq(payrollPeriod.organizationId, input.organizationId),
						eq(payrollPeriod.id, input.periodId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapPeriodRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll period");
		}
	},
};
