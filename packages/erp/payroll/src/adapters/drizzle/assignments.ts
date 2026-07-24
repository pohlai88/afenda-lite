import { randomUUID } from "node:crypto";

import {
	and,
	db,
	eq,
	payrollDeductionRule,
	payrollEmployeeAssignment,
	payrollEarningRule,
	payrollRecurringDeduction,
	payrollRecurringEarning,
} from "@afenda/db";
import { ok, type Result } from "@afenda/errors/result";

import {
	parsePayrollDeductionRuleId,
	parsePayrollEmployeeAssignmentId,
	parsePayrollEarningRuleId,
	parsePayrollPayGroupId,
	parsePayrollRecurringDeductionId,
	parsePayrollRecurringEarningId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import { isEffectiveOnDate } from "../../shared/effective-date";
import { mapPersistenceFailure } from "../../shared/persistence-errors";
import { resolveCreateIdempotentReplay } from "../../shared/source-idempotency";
import type { PayrollAssignmentsStore } from "../../store/assignments";
import type {
	PayrollDeductionRule,
	PayrollEarningRule,
	PayrollEmployeeAssignment,
	PayrollEmployeeAssignmentCreateRecord,
	PayrollRecurringDeduction,
	PayrollRecurringDeductionCreateRecord,
	PayrollRecurringEarning,
	PayrollRecurringEarningCreateRecord,
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

function mapAssignmentRow(
	row: typeof payrollEmployeeAssignment.$inferSelect,
): Result<PayrollEmployeeAssignment> {
	const id = parsePayrollEmployeeAssignmentId(row.id);
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
		employeeId: row.employeeId,
		payGroupId: payGroupId.data,
		status: row.status as PayrollEmployeeAssignment["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapRecurringEarningRow(
	row: typeof payrollRecurringEarning.$inferSelect,
): Result<PayrollRecurringEarning> {
	const id = parsePayrollRecurringEarningId(row.id);
	const assignmentId = parsePayrollEmployeeAssignmentId(row.assignmentId);
	const earningRuleId = parsePayrollEarningRuleId(row.earningRuleId);
	if (!id.ok) {
		return id;
	}
	if (!assignmentId.ok) {
		return assignmentId;
	}
	if (!earningRuleId.ok) {
		return earningRuleId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: row.employeeId,
		assignmentId: assignmentId.data,
		earningRuleId: earningRuleId.data,
		amount: formatDecimal(row.amount),
		currencyCode: row.currencyCode,
		status: row.status as PayrollRecurringEarning["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapRecurringDeductionRow(
	row: typeof payrollRecurringDeduction.$inferSelect,
): Result<PayrollRecurringDeduction> {
	const id = parsePayrollRecurringDeductionId(row.id);
	const assignmentId = parsePayrollEmployeeAssignmentId(row.assignmentId);
	const deductionRuleId = parsePayrollDeductionRuleId(row.deductionRuleId);
	if (!id.ok) {
		return id;
	}
	if (!assignmentId.ok) {
		return assignmentId;
	}
	if (!deductionRuleId.ok) {
		return deductionRuleId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: row.employeeId,
		assignmentId: assignmentId.data,
		deductionRuleId: deductionRuleId.data,
		amount: formatDecimal(row.amount),
		currencyCode: row.currencyCode,
		status: row.status as PayrollRecurringDeduction["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapEarningRuleRow(
	row: typeof payrollEarningRule.$inferSelect,
): Result<PayrollEarningRule> {
	const id = parsePayrollEarningRuleId(row.id);
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
		code: row.code,
		name: row.name,
		ruleType: row.ruleType as PayrollEarningRule["ruleType"],
		amount: row.amount === null ? null : formatDecimal(row.amount),
		rate: row.rate === null ? null : formatDecimal(row.rate),
		currencyCode: row.currencyCode,
		ruleVersion: row.ruleVersion,
		status: row.status as PayrollEarningRule["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapDeductionRuleRow(
	row: typeof payrollDeductionRule.$inferSelect,
): Result<PayrollDeductionRule> {
	const id = parsePayrollDeductionRuleId(row.id);
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
		code: row.code,
		name: row.name,
		ruleType: row.ruleType as PayrollDeductionRule["ruleType"],
		amount: row.amount === null ? null : formatDecimal(row.amount),
		rate: row.rate === null ? null : formatDecimal(row.rate),
		currencyCode: row.currencyCode,
		ruleVersion: row.ruleVersion,
		taxTiming: row.taxTiming as PayrollDeductionRule["taxTiming"],
		status: row.status as PayrollDeductionRule["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

export const drizzleAssignmentsMethods: PayrollAssignmentsStore = {
	async findEmployeeAssignmentByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(payrollEmployeeAssignment)
				.where(
					and(
						eq(payrollEmployeeAssignment.organizationId, input.organizationId),
						eq(
							payrollEmployeeAssignment.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			const mapped = mapAssignmentRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			return ok({
				assignment: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll employee assignment idempotency record",
			);
		}
	},

	async createEmployeeAssignment(record, ports) {
		const replay = await this.findEmployeeAssignmentByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!replay.ok) {
			return replay;
		}
		const resolved = resolveCreateIdempotentReplay({
			existing:
				replay.data === null
					? null
					: {
							entity: replay.data.assignment,
							createRequestFingerprint: replay.data.createRequestFingerprint,
						},
			requestFingerprint: record.createRequestFingerprint,
		});
		if (!resolved.ok) {
			return resolved;
		}
		if (resolved.data !== "create") {
			return ok(resolved.data);
		}

		const assignmentId = parsePayrollEmployeeAssignmentId(randomUUID());
		if (!assignmentId.ok) {
			return assignmentId;
		}

		try {
			const rows = await db
				.insert(payrollEmployeeAssignment)
				.values({
					id: assignmentId.data,
					organizationId: record.organizationId,
					employeeId: record.employeeId,
					payGroupId: record.payGroupId,
					status: "active",
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
					"Failed to create payroll employee assignment",
				);
			}
			const mapped = mapAssignmentRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_employee_assignment",
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
				"Failed to create payroll employee assignment",
			);
		}
	},

	async getEmployeeAssignment(input) {
		try {
			const rows = await db
				.select()
				.from(payrollEmployeeAssignment)
				.where(
					and(
						eq(payrollEmployeeAssignment.organizationId, input.organizationId),
						eq(payrollEmployeeAssignment.id, input.assignmentId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapAssignmentRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll employee assignment",
			);
		}
	},

	async findRecurringEarningByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(payrollRecurringEarning)
				.where(
					and(
						eq(payrollRecurringEarning.organizationId, input.organizationId),
						eq(
							payrollRecurringEarning.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			const mapped = mapRecurringEarningRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			return ok({
				recurringEarning: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll recurring earning idempotency record",
			);
		}
	},

	async createRecurringEarning(record, ports) {
		const replay = await this.findRecurringEarningByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!replay.ok) {
			return replay;
		}
		const resolved = resolveCreateIdempotentReplay({
			existing:
				replay.data === null
					? null
					: {
							entity: replay.data.recurringEarning,
							createRequestFingerprint: replay.data.createRequestFingerprint,
						},
			requestFingerprint: record.createRequestFingerprint,
		});
		if (!resolved.ok) {
			return resolved;
		}
		if (resolved.data !== "create") {
			return ok(resolved.data);
		}

		const recurringEarningId = parsePayrollRecurringEarningId(randomUUID());
		if (!recurringEarningId.ok) {
			return recurringEarningId;
		}

		try {
			const rows = await db
				.insert(payrollRecurringEarning)
				.values({
					id: recurringEarningId.data,
					organizationId: record.organizationId,
					employeeId: record.employeeId,
					assignmentId: record.assignmentId,
					earningRuleId: record.earningRuleId,
					amount: record.amount,
					currencyCode: record.currencyCode,
					status: "active",
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
					"Failed to create payroll recurring earning",
				);
			}
			const mapped = mapRecurringEarningRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_recurring_earning",
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
				"Failed to create payroll recurring earning",
			);
		}
	},

	async getRecurringEarning(input) {
		try {
			const rows = await db
				.select()
				.from(payrollRecurringEarning)
				.where(
					and(
						eq(payrollRecurringEarning.organizationId, input.organizationId),
						eq(payrollRecurringEarning.id, input.recurringEarningId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapRecurringEarningRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll recurring earning",
			);
		}
	},

	async findRecurringDeductionByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(payrollRecurringDeduction)
				.where(
					and(
						eq(payrollRecurringDeduction.organizationId, input.organizationId),
						eq(
							payrollRecurringDeduction.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			const mapped = mapRecurringDeductionRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			return ok({
				recurringDeduction: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll recurring deduction idempotency record",
			);
		}
	},

	async createRecurringDeduction(record, ports) {
		const replay = await this.findRecurringDeductionByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!replay.ok) {
			return replay;
		}
		const resolved = resolveCreateIdempotentReplay({
			existing:
				replay.data === null
					? null
					: {
							entity: replay.data.recurringDeduction,
							createRequestFingerprint: replay.data.createRequestFingerprint,
						},
			requestFingerprint: record.createRequestFingerprint,
		});
		if (!resolved.ok) {
			return resolved;
		}
		if (resolved.data !== "create") {
			return ok(resolved.data);
		}

		const recurringDeductionId = parsePayrollRecurringDeductionId(randomUUID());
		if (!recurringDeductionId.ok) {
			return recurringDeductionId;
		}

		try {
			const rows = await db
				.insert(payrollRecurringDeduction)
				.values({
					id: recurringDeductionId.data,
					organizationId: record.organizationId,
					employeeId: record.employeeId,
					assignmentId: record.assignmentId,
					deductionRuleId: record.deductionRuleId,
					amount: record.amount,
					currencyCode: record.currencyCode,
					status: "active",
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
					"Failed to create payroll recurring deduction",
				);
			}
			const mapped = mapRecurringDeductionRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_recurring_deduction",
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
				"Failed to create payroll recurring deduction",
			);
		}
	},

	async getRecurringDeduction(input) {
		try {
			const rows = await db
				.select()
				.from(payrollRecurringDeduction)
				.where(
					and(
						eq(payrollRecurringDeduction.organizationId, input.organizationId),
						eq(payrollRecurringDeduction.id, input.recurringDeductionId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapRecurringDeductionRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll recurring deduction",
			);
		}
	},

	async listActiveAssignmentsForPayGroup(input: {
		organizationId: string;
		payGroupId: import("../../brands").PayrollPayGroupId;
		effectiveDate: string;
	}) {
		try {
			const rows = await db
				.select()
				.from(payrollEmployeeAssignment)
				.where(
					and(
						eq(payrollEmployeeAssignment.organizationId, input.organizationId),
						eq(payrollEmployeeAssignment.payGroupId, input.payGroupId),
						eq(payrollEmployeeAssignment.status, "active"),
					),
				);
			const assignments: PayrollEmployeeAssignment[] = [];
			for (const row of rows) {
				if (
					!isEffectiveOnDate(
						row.effectiveFrom,
						row.effectiveTo,
						input.effectiveDate,
					)
				) {
					continue;
				}
				const mapped = mapAssignmentRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				assignments.push(mapped.data);
			}
			return ok(assignments);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list active payroll employee assignments",
			);
		}
	},

	async listRecurringEarningsForAssignment(input: {
		organizationId: string;
		assignmentId: import("../../brands").PayrollEmployeeAssignmentId;
		effectiveDate: string;
	}) {
		try {
			const rows = await db
				.select()
				.from(payrollRecurringEarning)
				.where(
					and(
						eq(payrollRecurringEarning.organizationId, input.organizationId),
						eq(payrollRecurringEarning.assignmentId, input.assignmentId),
						eq(payrollRecurringEarning.status, "active"),
					),
				);
			const recurringEarnings: PayrollRecurringEarning[] = [];
			for (const row of rows) {
				if (
					!isEffectiveOnDate(
						row.effectiveFrom,
						row.effectiveTo,
						input.effectiveDate,
					)
				) {
					continue;
				}
				const mapped = mapRecurringEarningRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				recurringEarnings.push(mapped.data);
			}
			return ok(recurringEarnings);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll recurring earnings for assignment",
			);
		}
	},

	async listRecurringDeductionsForAssignment(input: {
		organizationId: string;
		assignmentId: import("../../brands").PayrollEmployeeAssignmentId;
		effectiveDate: string;
	}) {
		try {
			const rows = await db
				.select()
				.from(payrollRecurringDeduction)
				.where(
					and(
						eq(payrollRecurringDeduction.organizationId, input.organizationId),
						eq(payrollRecurringDeduction.assignmentId, input.assignmentId),
						eq(payrollRecurringDeduction.status, "active"),
					),
				);
			const recurringDeductions: PayrollRecurringDeduction[] = [];
			for (const row of rows) {
				if (
					!isEffectiveOnDate(
						row.effectiveFrom,
						row.effectiveTo,
						input.effectiveDate,
					)
				) {
					continue;
				}
				const mapped = mapRecurringDeductionRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				recurringDeductions.push(mapped.data);
			}
			return ok(recurringDeductions);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll recurring deductions for assignment",
			);
		}
	},
};

export const drizzleAssignmentRuleLookups = {
	async getEarningRule(input: {
		organizationId: string;
		earningRuleId: import("../../brands").PayrollEarningRuleId;
	}): Promise<Result<PayrollEarningRule | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollEarningRule)
				.where(
					and(
						eq(payrollEarningRule.organizationId, input.organizationId),
						eq(payrollEarningRule.id, input.earningRuleId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapEarningRuleRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll earning rule");
		}
	},

	async getDeductionRule(input: {
		organizationId: string;
		deductionRuleId: import("../../brands").PayrollDeductionRuleId;
	}): Promise<Result<PayrollDeductionRule | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollDeductionRule)
				.where(
					and(
						eq(payrollDeductionRule.organizationId, input.organizationId),
						eq(payrollDeductionRule.id, input.deductionRuleId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapDeductionRuleRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll deduction rule",
			);
		}
	},
};
