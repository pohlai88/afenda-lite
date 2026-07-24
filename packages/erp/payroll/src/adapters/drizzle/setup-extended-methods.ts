import {
	and,
	db,
	eq,
	payrollCalendar,
	payrollDeductionRule,
	payrollEarningRule,
	payrollPayGroup,
	payrollPeriod,
	payrollRuleFinalizedUsage,
	payrollStatutoryRule,
} from "@afenda/db";
import { ok, type Result } from "@afenda/errors/result";

import {
	parsePayrollCalendarId,
	parsePayrollDeductionRuleId,
	parsePayrollEarningRuleId,
	parsePayrollPayGroupId,
	parsePayrollPeriodId,
	parsePayrollRunId,
	parsePayrollStatutoryRuleId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	isPostgresUniqueViolation,
	mapConflict,
	mapInvalidState,
	mapNotFound,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import { assertRuleNotLockedByFinalizedRun } from "../../shared/setup-rule-guards";
import type { PayrollSetupStore } from "../../store/setup";
import type {
	PayrollCalendar,
	PayrollCalendarArchiveInput,
	PayrollDeductionRule,
	PayrollEarningRule,
	PayrollPayGroup,
	PayrollPayGroupArchiveInput,
	PayrollPayGroupUpdateInput,
	PayrollPeriod,
	PayrollPeriodCloseInput,
	PayrollPeriodUpdateInput,
	PayrollRuleSupersedeResult,
	PayrollStatutoryRule,
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

function formatDecimal(value: string | null | undefined): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	return String(value);
}

function mapCalendarRow(
	row: typeof payrollCalendar.$inferSelect,
): Result<PayrollCalendar> {
	const id = parsePayrollCalendarId(row.id);
	if (!id.ok) {
		return id;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		timezone: row.timezone,
		status: row.status as PayrollCalendar["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapPayGroupRow(
	row: typeof payrollPayGroup.$inferSelect,
): Result<PayrollPayGroup> {
	const id = parsePayrollPayGroupId(row.id);
	const calendarId = parsePayrollCalendarId(row.calendarId);
	if (!id.ok) {
		return id;
	}
	if (!calendarId.ok) {
		return calendarId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		calendarId: calendarId.data,
		code: row.code,
		name: row.name,
		currencyCode: row.currencyCode,
		status: row.status as PayrollPayGroup["status"],
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
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
		amount: formatDecimal(row.amount),
		rate: formatDecimal(row.rate),
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
		amount: formatDecimal(row.amount),
		rate: formatDecimal(row.rate),
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

function mapStatutoryRuleRow(
	row: typeof payrollStatutoryRule.$inferSelect,
): Result<PayrollStatutoryRule> {
	const id = parsePayrollStatutoryRuleId(row.id);
	const payGroupId = parsePayrollPayGroupId(row.payGroupId);
	if (!id.ok) {
		return id;
	}
	if (!payGroupId.ok) {
		return payGroupId;
	}
	const configJson =
		typeof row.configJson === "object" && row.configJson !== null
			? (row.configJson as Record<string, unknown>)
			: {};
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		payGroupId: payGroupId.data,
		code: row.code,
		name: row.name,
		jurisdictionCode: row.jurisdictionCode,
		configJson,
		ruleVersion: row.ruleVersion,
		status: row.status as PayrollStatutoryRule["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

export function createDrizzleSetupExtendedMethods(
	host: PayrollSetupStore,
): Pick<
	PayrollSetupStore,
	| "listCalendars"
	| "archiveCalendar"
	| "updatePayGroup"
	| "archivePayGroup"
	| "updatePeriod"
	| "closePeriod"
	| "getEarningRule"
	| "updateEarningRule"
	| "archiveEarningRule"
	| "supersedeEarningRule"
	| "getDeductionRule"
	| "updateDeductionRule"
	| "archiveDeductionRule"
	| "supersedeDeductionRule"
	| "getStatutoryRule"
	| "updateStatutoryRule"
	| "archiveStatutoryRule"
	| "supersedeStatutoryRule"
	| "recordRuleVersionUsedByFinalizedRun"
	| "isRuleVersionUsedByFinalizedRun"
> {
	async function queryRuleFinalizedUsage(
		checkInput: Parameters<
			PayrollSetupStore["isRuleVersionUsedByFinalizedRun"]
		>[0],
	): Promise<Result<boolean>> {
		try {
			const rows = await db
				.select({ id: payrollRuleFinalizedUsage.id })
				.from(payrollRuleFinalizedUsage)
				.where(
					and(
						eq(
							payrollRuleFinalizedUsage.organizationId,
							checkInput.organizationId,
						),
						eq(payrollRuleFinalizedUsage.ruleKind, checkInput.ruleKind),
						eq(payrollRuleFinalizedUsage.ruleId, checkInput.ruleId),
					),
				)
				.limit(1);
			return ok(rows[0] !== undefined);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to check payroll rule finalized usage",
			);
		}
	}

	const ruleLockStore: Pick<
		PayrollSetupStore,
		"isRuleVersionUsedByFinalizedRun"
	> = {
		isRuleVersionUsedByFinalizedRun: queryRuleFinalizedUsage,
	};

	async function transitionCalendarStatus(
		calendarInput: PayrollCalendarArchiveInput,
		nextStatus: PayrollCalendar["status"],
		ports: MutationPorts,
	): Promise<Result<PayrollCalendar>> {
		const current = await host.getCalendar({
			organizationId: calendarInput.organizationId,
			calendarId: calendarInput.calendarId,
		});
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return mapNotFound("Payroll calendar not found");
		}

		const versionCheck = assertExpectedVersion(
			current.data.version,
			calendarInput.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (current.data.status === nextStatus) {
			return mapInvalidState("Payroll calendar is already in the requested status");
		}

		try {
			const rows = await db
				.update(payrollCalendar)
				.set({
					status: nextStatus,
					version: current.data.version + 1,
					updatedBy: calendarInput.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(payrollCalendar.organizationId, calendarInput.organizationId),
						eq(payrollCalendar.id, calendarInput.calendarId),
						eq(payrollCalendar.version, calendarInput.expectedVersion),
					),
				)
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return mapConflict("Payroll calendar version is stale");
			}

			const mapped = mapCalendarRow(row);
			if (!mapped.ok) {
				return mapped;
			}

			const audit = await recordAudit(ports, {
				organizationId: calendarInput.organizationId,
				actorUserId: calendarInput.actorUserId,
				correlationId: calendarInput.correlationId,
				entity: "payroll_calendar",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return mapped;
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update payroll calendar status");
		}
	}

	return {
		async listCalendars(listInput) {
			try {
				const rows = await db
					.select()
					.from(payrollCalendar)
					.where(
						listInput.status === undefined
							? eq(payrollCalendar.organizationId, listInput.organizationId)
							: and(
									eq(payrollCalendar.organizationId, listInput.organizationId),
									eq(payrollCalendar.status, listInput.status),
								),
					);
				const calendars: PayrollCalendar[] = [];
				for (const row of rows) {
					const mapped = mapCalendarRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					calendars.push(mapped.data);
				}
				return ok(calendars);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to list payroll calendars");
			}
		},

		async archiveCalendar(calendarInput, ports) {
			return transitionCalendarStatus(calendarInput, "archived", ports);
		},

		async updatePayGroup(payGroupInput, ports) {
			const current = await host.getPayGroup({
				organizationId: payGroupInput.organizationId,
				payGroupId: payGroupInput.payGroupId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return mapNotFound("Payroll pay group not found");
			}

			const versionCheck = assertExpectedVersion(
				current.data.version,
				payGroupInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (current.data.status === "archived") {
				return mapInvalidState("Archived pay groups cannot be updated");
			}

			try {
				const rows = await db
					.update(payrollPayGroup)
					.set({
						name: payGroupInput.name ?? current.data.name,
						currencyCode: payGroupInput.currencyCode ?? current.data.currencyCode,
						version: current.data.version + 1,
						updatedBy: payGroupInput.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollPayGroup.organizationId, payGroupInput.organizationId),
							eq(payrollPayGroup.id, payGroupInput.payGroupId),
							eq(payrollPayGroup.version, payGroupInput.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapConflict("Payroll pay group version is stale");
				}

				const mapped = mapPayGroupRow(row);
				if (!mapped.ok) {
					return mapped;
				}

				const audit = await recordAudit(ports, {
					organizationId: payGroupInput.organizationId,
					actorUserId: payGroupInput.actorUserId,
					correlationId: payGroupInput.correlationId,
					entity: "payroll_pay_group",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return mapped;
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to update payroll pay group");
			}
		},

		async archivePayGroup(payGroupInput, ports) {
			const current = await host.getPayGroup({
				organizationId: payGroupInput.organizationId,
				payGroupId: payGroupInput.payGroupId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return mapNotFound("Payroll pay group not found");
			}

			const versionCheck = assertExpectedVersion(
				current.data.version,
				payGroupInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (current.data.status === "archived") {
				return mapInvalidState("Payroll pay group is already archived");
			}

			try {
				const rows = await db
					.update(payrollPayGroup)
					.set({
						status: "archived",
						version: current.data.version + 1,
						updatedBy: payGroupInput.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollPayGroup.organizationId, payGroupInput.organizationId),
							eq(payrollPayGroup.id, payGroupInput.payGroupId),
							eq(payrollPayGroup.version, payGroupInput.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapConflict("Payroll pay group version is stale");
				}

				const mapped = mapPayGroupRow(row);
				if (!mapped.ok) {
					return mapped;
				}

				const audit = await recordAudit(ports, {
					organizationId: payGroupInput.organizationId,
					actorUserId: payGroupInput.actorUserId,
					correlationId: payGroupInput.correlationId,
					entity: "payroll_pay_group",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return mapped;
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to archive payroll pay group");
			}
		},

		async updatePeriod(periodInput, ports) {
			const current = await host.getPeriod({
				organizationId: periodInput.organizationId,
				periodId: periodInput.periodId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return mapNotFound("Payroll period not found");
			}

			const versionCheck = assertExpectedVersion(
				current.data.version,
				periodInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (current.data.status === "closed") {
				return mapInvalidState("Closed payroll periods cannot be updated");
			}

			try {
				const rows = await db
					.update(payrollPeriod)
					.set({
						cutoffDate: periodInput.cutoffDate ?? current.data.cutoffDate,
						version: current.data.version + 1,
						updatedBy: periodInput.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollPeriod.organizationId, periodInput.organizationId),
							eq(payrollPeriod.id, periodInput.periodId),
							eq(payrollPeriod.version, periodInput.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapConflict("Payroll period version is stale");
				}

				const mapped = mapPeriodRow(row);
				if (!mapped.ok) {
					return mapped;
				}

				const audit = await recordAudit(ports, {
					organizationId: periodInput.organizationId,
					actorUserId: periodInput.actorUserId,
					correlationId: periodInput.correlationId,
					entity: "payroll_period",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return mapped;
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to update payroll period");
			}
		},

		async closePeriod(periodInput, ports) {
			const current = await host.getPeriod({
				organizationId: periodInput.organizationId,
				periodId: periodInput.periodId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return mapNotFound("Payroll period not found");
			}

			const versionCheck = assertExpectedVersion(
				current.data.version,
				periodInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (current.data.status === "closed") {
				return mapInvalidState("Payroll period is already closed");
			}

			try {
				const rows = await db
					.update(payrollPeriod)
					.set({
						status: "closed",
						version: current.data.version + 1,
						updatedBy: periodInput.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollPeriod.organizationId, periodInput.organizationId),
							eq(payrollPeriod.id, periodInput.periodId),
							eq(payrollPeriod.version, periodInput.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapConflict("Payroll period version is stale");
				}

				const mapped = mapPeriodRow(row);
				if (!mapped.ok) {
					return mapped;
				}

				const audit = await recordAudit(ports, {
					organizationId: periodInput.organizationId,
					actorUserId: periodInput.actorUserId,
					correlationId: periodInput.correlationId,
					entity: "payroll_period",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return mapped;
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to close payroll period");
			}
		},

		async getEarningRule(getInput) {
			try {
				const rows = await db
					.select()
					.from(payrollEarningRule)
					.where(
						and(
							eq(payrollEarningRule.organizationId, getInput.organizationId),
							eq(payrollEarningRule.id, getInput.ruleId),
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

		async updateEarningRule(ruleInput, ports) {
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "earning",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}

			const current = await this.getEarningRule({
				organizationId: ruleInput.organizationId,
				ruleId: ruleInput.ruleId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return mapNotFound("Payroll earning rule not found");
			}

			const versionCheck = assertExpectedVersion(
				current.data.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (current.data.status !== "active") {
				return mapInvalidState("Only active earning rules can be updated");
			}

			try {
				const rows = await db
					.update(payrollEarningRule)
					.set({
						name: ruleInput.name ?? current.data.name,
						amount:
							ruleInput.amount !== undefined
								? ruleInput.amount
								: current.data.amount,
						rate:
							ruleInput.rate !== undefined ? ruleInput.rate : current.data.rate,
						effectiveTo:
							ruleInput.effectiveTo !== undefined
								? ruleInput.effectiveTo
								: current.data.effectiveTo,
						version: current.data.version + 1,
						updatedBy: ruleInput.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollEarningRule.organizationId, ruleInput.organizationId),
							eq(payrollEarningRule.id, ruleInput.ruleId),
							eq(payrollEarningRule.version, ruleInput.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapConflict("Payroll earning rule version is stale");
				}

				const mapped = mapEarningRuleRow(row);
				if (!mapped.ok) {
					return mapped;
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_earning_rule",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return mapped;
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to update payroll earning rule");
			}
		},

		async archiveEarningRule(ruleInput, ports) {
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "earning",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}

			const current = await this.getEarningRule({
				organizationId: ruleInput.organizationId,
				ruleId: ruleInput.ruleId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return mapNotFound("Payroll earning rule not found");
			}

			const versionCheck = assertExpectedVersion(
				current.data.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (current.data.status === "archived") {
				return mapInvalidState("Payroll earning rule is already archived");
			}

			try {
				const rows = await db
					.update(payrollEarningRule)
					.set({
						status: "archived",
						version: current.data.version + 1,
						updatedBy: ruleInput.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollEarningRule.organizationId, ruleInput.organizationId),
							eq(payrollEarningRule.id, ruleInput.ruleId),
							eq(payrollEarningRule.version, ruleInput.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapConflict("Payroll earning rule version is stale");
				}

				const mapped = mapEarningRuleRow(row);
				if (!mapped.ok) {
					return mapped;
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_earning_rule",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return mapped;
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to archive payroll earning rule");
			}
		},

		async supersedeEarningRule(record, ports) {
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: record.organizationId,
				ruleKind: "earning",
				ruleId: record.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}

			const existingResult = await this.getEarningRule({
				organizationId: record.organizationId,
				ruleId: record.ruleId,
			});
			if (!existingResult.ok) {
				return existingResult;
			}
			if (existingResult.data === null) {
				return mapNotFound("Payroll earning rule not found");
			}
			const existing = existingResult.data;

			const versionCheck = assertExpectedVersion(
				existing.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (existing.status !== "active") {
				return mapInvalidState("Only active earning rules can be superseded");
			}

			let supersededRow: typeof payrollEarningRule.$inferSelect | undefined;
			try {
				const rows = await db
					.update(payrollEarningRule)
					.set({
						status: "superseded",
						version: existing.version + 1,
						updatedBy: record.createdBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollEarningRule.organizationId, record.organizationId),
							eq(payrollEarningRule.id, record.ruleId),
							eq(payrollEarningRule.version, record.expectedVersion),
						),
					)
					.returning();
				supersededRow = rows[0];
				if (supersededRow === undefined) {
					return mapConflict("Payroll earning rule version is stale");
				}
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to supersede payroll earning rule",
				);
			}

			const supersededMapped = mapEarningRuleRow(supersededRow);
			if (!supersededMapped.ok) {
				return supersededMapped;
			}

			const successorResult = await host.createEarningRule(
				{
					organizationId: record.organizationId,
					payGroupId: existing.payGroupId,
					code: existing.code,
					name: record.name ?? existing.name,
					ruleType: record.ruleType ?? existing.ruleType,
					amount: record.amount !== undefined ? record.amount : existing.amount,
					rate: record.rate !== undefined ? record.rate : existing.rate,
					currencyCode: record.currencyCode ?? existing.currencyCode,
					ruleVersion: record.ruleVersion,
					effectiveFrom: record.effectiveFrom,
					effectiveTo: record.effectiveTo ?? null,
					idempotencyKey: record.idempotencyKey,
					createRequestFingerprint: record.createRequestFingerprint,
					createdBy: record.createdBy,
					correlationId: record.correlationId,
				},
				ports,
			);
			if (!successorResult.ok) {
				try {
					await db
						.update(payrollEarningRule)
						.set({
							status: existing.status,
							version: existing.version,
							updatedBy: existing.updatedBy,
							updatedAt: existing.updatedAt,
						})
						.where(
							and(
								eq(payrollEarningRule.organizationId, record.organizationId),
								eq(payrollEarningRule.id, record.ruleId),
							),
						);
				} catch {
					return mapPersistenceFailure(
						new Error("Supersede rollback failed"),
						"Failed to roll back superseded payroll earning rule",
					);
				}
				return successorResult;
			}

			return ok({
				superseded: supersededMapped.data,
				successor: successorResult.data,
			} satisfies PayrollRuleSupersedeResult<PayrollEarningRule>);
		},

		async getDeductionRule(getInput) {
			try {
				const rows = await db
					.select()
					.from(payrollDeductionRule)
					.where(
						and(
							eq(payrollDeductionRule.organizationId, getInput.organizationId),
							eq(payrollDeductionRule.id, getInput.ruleId),
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

		async updateDeductionRule(ruleInput, ports) {
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "deduction",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}

			const current = await this.getDeductionRule({
				organizationId: ruleInput.organizationId,
				ruleId: ruleInput.ruleId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return mapNotFound("Payroll deduction rule not found");
			}

			const versionCheck = assertExpectedVersion(
				current.data.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (current.data.status !== "active") {
				return mapInvalidState("Only active deduction rules can be updated");
			}

			try {
				const rows = await db
					.update(payrollDeductionRule)
					.set({
						name: ruleInput.name ?? current.data.name,
						amount:
							ruleInput.amount !== undefined
								? ruleInput.amount
								: current.data.amount,
						rate:
							ruleInput.rate !== undefined ? ruleInput.rate : current.data.rate,
						taxTiming:
							ruleInput.taxTiming !== undefined
								? ruleInput.taxTiming
								: current.data.taxTiming,
						effectiveTo:
							ruleInput.effectiveTo !== undefined
								? ruleInput.effectiveTo
								: current.data.effectiveTo,
						version: current.data.version + 1,
						updatedBy: ruleInput.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollDeductionRule.organizationId, ruleInput.organizationId),
							eq(payrollDeductionRule.id, ruleInput.ruleId),
							eq(payrollDeductionRule.version, ruleInput.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapConflict("Payroll deduction rule version is stale");
				}

				const mapped = mapDeductionRuleRow(row);
				if (!mapped.ok) {
					return mapped;
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_deduction_rule",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return mapped;
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to update payroll deduction rule",
				);
			}
		},

		async archiveDeductionRule(ruleInput, ports) {
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "deduction",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}

			const current = await this.getDeductionRule({
				organizationId: ruleInput.organizationId,
				ruleId: ruleInput.ruleId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return mapNotFound("Payroll deduction rule not found");
			}

			const versionCheck = assertExpectedVersion(
				current.data.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (current.data.status === "archived") {
				return mapInvalidState("Payroll deduction rule is already archived");
			}

			try {
				const rows = await db
					.update(payrollDeductionRule)
					.set({
						status: "archived",
						version: current.data.version + 1,
						updatedBy: ruleInput.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollDeductionRule.organizationId, ruleInput.organizationId),
							eq(payrollDeductionRule.id, ruleInput.ruleId),
							eq(payrollDeductionRule.version, ruleInput.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapConflict("Payroll deduction rule version is stale");
				}

				const mapped = mapDeductionRuleRow(row);
				if (!mapped.ok) {
					return mapped;
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_deduction_rule",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return mapped;
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to archive payroll deduction rule",
				);
			}
		},

		async supersedeDeductionRule(record, ports) {
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: record.organizationId,
				ruleKind: "deduction",
				ruleId: record.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}

			const existingResult = await this.getDeductionRule({
				organizationId: record.organizationId,
				ruleId: record.ruleId,
			});
			if (!existingResult.ok) {
				return existingResult;
			}
			if (existingResult.data === null) {
				return mapNotFound("Payroll deduction rule not found");
			}
			const existing = existingResult.data;

			const versionCheck = assertExpectedVersion(
				existing.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (existing.status !== "active") {
				return mapInvalidState("Only active deduction rules can be superseded");
			}

			let supersededRow: typeof payrollDeductionRule.$inferSelect | undefined;
			try {
				const rows = await db
					.update(payrollDeductionRule)
					.set({
						status: "superseded",
						version: existing.version + 1,
						updatedBy: record.createdBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollDeductionRule.organizationId, record.organizationId),
							eq(payrollDeductionRule.id, record.ruleId),
							eq(payrollDeductionRule.version, record.expectedVersion),
						),
					)
					.returning();
				supersededRow = rows[0];
				if (supersededRow === undefined) {
					return mapConflict("Payroll deduction rule version is stale");
				}
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to supersede payroll deduction rule",
				);
			}

			const supersededMapped = mapDeductionRuleRow(supersededRow);
			if (!supersededMapped.ok) {
				return supersededMapped;
			}

			const successorResult = await host.createDeductionRule(
				{
					organizationId: record.organizationId,
					payGroupId: existing.payGroupId,
					code: existing.code,
					name: record.name ?? existing.name,
					ruleType: record.ruleType ?? existing.ruleType,
					amount: record.amount !== undefined ? record.amount : existing.amount,
					rate: record.rate !== undefined ? record.rate : existing.rate,
					currencyCode: record.currencyCode ?? existing.currencyCode,
					taxTiming: record.taxTiming ?? existing.taxTiming,
					ruleVersion: record.ruleVersion,
					effectiveFrom: record.effectiveFrom,
					effectiveTo: record.effectiveTo ?? null,
					idempotencyKey: record.idempotencyKey,
					createRequestFingerprint: record.createRequestFingerprint,
					createdBy: record.createdBy,
					correlationId: record.correlationId,
				},
				ports,
			);
			if (!successorResult.ok) {
				try {
					await db
						.update(payrollDeductionRule)
						.set({
							status: existing.status,
							version: existing.version,
							updatedBy: existing.updatedBy,
							updatedAt: existing.updatedAt,
						})
						.where(
							and(
								eq(payrollDeductionRule.organizationId, record.organizationId),
								eq(payrollDeductionRule.id, record.ruleId),
							),
						);
				} catch {
					return mapPersistenceFailure(
						new Error("Supersede rollback failed"),
						"Failed to roll back superseded payroll deduction rule",
					);
				}
				return successorResult;
			}

			return ok({
				superseded: supersededMapped.data,
				successor: successorResult.data,
			} satisfies PayrollRuleSupersedeResult<PayrollDeductionRule>);
		},

		async getStatutoryRule(getInput) {
			try {
				const rows = await db
					.select()
					.from(payrollStatutoryRule)
					.where(
						and(
							eq(payrollStatutoryRule.organizationId, getInput.organizationId),
							eq(payrollStatutoryRule.id, getInput.ruleId),
						),
					)
					.limit(1);
				const row = rows[0];
				if (row === undefined) {
					return ok(null);
				}
				return mapStatutoryRuleRow(row);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to load payroll statutory rule",
				);
			}
		},

		async updateStatutoryRule(ruleInput, ports) {
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "statutory",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}

			const current = await this.getStatutoryRule({
				organizationId: ruleInput.organizationId,
				ruleId: ruleInput.ruleId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return mapNotFound("Payroll statutory rule not found");
			}

			const versionCheck = assertExpectedVersion(
				current.data.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (current.data.status !== "active") {
				return mapInvalidState("Only active statutory rules can be updated");
			}

			try {
				const rows = await db
					.update(payrollStatutoryRule)
					.set({
						name: ruleInput.name ?? current.data.name,
						jurisdictionCode:
							ruleInput.jurisdictionCode ?? current.data.jurisdictionCode,
						configJson: ruleInput.configJson ?? current.data.configJson,
						effectiveTo:
							ruleInput.effectiveTo !== undefined
								? ruleInput.effectiveTo
								: current.data.effectiveTo,
						version: current.data.version + 1,
						updatedBy: ruleInput.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollStatutoryRule.organizationId, ruleInput.organizationId),
							eq(payrollStatutoryRule.id, ruleInput.ruleId),
							eq(payrollStatutoryRule.version, ruleInput.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapConflict("Payroll statutory rule version is stale");
				}

				const mapped = mapStatutoryRuleRow(row);
				if (!mapped.ok) {
					return mapped;
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_statutory_rule",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return mapped;
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to update payroll statutory rule",
				);
			}
		},

		async archiveStatutoryRule(ruleInput, ports) {
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "statutory",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}

			const current = await this.getStatutoryRule({
				organizationId: ruleInput.organizationId,
				ruleId: ruleInput.ruleId,
			});
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return mapNotFound("Payroll statutory rule not found");
			}

			const versionCheck = assertExpectedVersion(
				current.data.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (current.data.status === "archived") {
				return mapInvalidState("Payroll statutory rule is already archived");
			}

			try {
				const rows = await db
					.update(payrollStatutoryRule)
					.set({
						status: "archived",
						version: current.data.version + 1,
						updatedBy: ruleInput.actorUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollStatutoryRule.organizationId, ruleInput.organizationId),
							eq(payrollStatutoryRule.id, ruleInput.ruleId),
							eq(payrollStatutoryRule.version, ruleInput.expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapConflict("Payroll statutory rule version is stale");
				}

				const mapped = mapStatutoryRuleRow(row);
				if (!mapped.ok) {
					return mapped;
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_statutory_rule",
					entityId: mapped.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return mapped;
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to archive payroll statutory rule",
				);
			}
		},

		async supersedeStatutoryRule(record, ports) {
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: record.organizationId,
				ruleKind: "statutory",
				ruleId: record.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}

			const existingResult = await this.getStatutoryRule({
				organizationId: record.organizationId,
				ruleId: record.ruleId,
			});
			if (!existingResult.ok) {
				return existingResult;
			}
			if (existingResult.data === null) {
				return mapNotFound("Payroll statutory rule not found");
			}
			const existing = existingResult.data;

			const versionCheck = assertExpectedVersion(
				existing.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (existing.status !== "active") {
				return mapInvalidState("Only active statutory rules can be superseded");
			}

			let supersededRow: typeof payrollStatutoryRule.$inferSelect | undefined;
			try {
				const rows = await db
					.update(payrollStatutoryRule)
					.set({
						status: "superseded",
						version: existing.version + 1,
						updatedBy: record.createdBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payrollStatutoryRule.organizationId, record.organizationId),
							eq(payrollStatutoryRule.id, record.ruleId),
							eq(payrollStatutoryRule.version, record.expectedVersion),
						),
					)
					.returning();
				supersededRow = rows[0];
				if (supersededRow === undefined) {
					return mapConflict("Payroll statutory rule version is stale");
				}
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to supersede payroll statutory rule",
				);
			}

			const supersededMapped = mapStatutoryRuleRow(supersededRow);
			if (!supersededMapped.ok) {
				return supersededMapped;
			}

			const successorResult = await host.createStatutoryRule(
				{
					organizationId: record.organizationId,
					payGroupId: existing.payGroupId,
					code: existing.code,
					name: record.name ?? existing.name,
					jurisdictionCode:
						record.jurisdictionCode ?? existing.jurisdictionCode,
					configJson: record.configJson ?? existing.configJson,
					ruleVersion: record.ruleVersion,
					effectiveFrom: record.effectiveFrom,
					effectiveTo: record.effectiveTo ?? null,
					idempotencyKey: record.idempotencyKey,
					createRequestFingerprint: record.createRequestFingerprint,
					createdBy: record.createdBy,
					correlationId: record.correlationId,
				},
				ports,
			);
			if (!successorResult.ok) {
				try {
					await db
						.update(payrollStatutoryRule)
						.set({
							status: existing.status,
							version: existing.version,
							updatedBy: existing.updatedBy,
							updatedAt: existing.updatedAt,
						})
						.where(
							and(
								eq(payrollStatutoryRule.organizationId, record.organizationId),
								eq(payrollStatutoryRule.id, record.ruleId),
							),
						);
				} catch {
					return mapPersistenceFailure(
						new Error("Supersede rollback failed"),
						"Failed to roll back superseded payroll statutory rule",
					);
				}
				return successorResult;
			}

			return ok({
				superseded: supersededMapped.data,
				successor: successorResult.data,
			} satisfies PayrollRuleSupersedeResult<PayrollStatutoryRule>);
		},

		async recordRuleVersionUsedByFinalizedRun(usageInput) {
			const runId = parsePayrollRunId(usageInput.runId);
			if (!runId.ok) {
				return runId;
			}

			try {
				await db.insert(payrollRuleFinalizedUsage).values({
					organizationId: usageInput.organizationId,
					ruleKind: usageInput.ruleKind,
					ruleId: usageInput.ruleId,
					runId: runId.data,
				});
				return ok({ recorded: true as const });
			} catch (error) {
				if (isPostgresUniqueViolation(error)) {
					return ok({ recorded: true as const });
				}
				return mapPersistenceFailure(
					error,
					"Failed to record payroll rule finalized usage",
				);
			}
		},

		async isRuleVersionUsedByFinalizedRun(checkInput) {
			return queryRuleFinalizedUsage(checkInput);
		},
	};
}
