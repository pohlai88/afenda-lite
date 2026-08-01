import { randomUUID } from "node:crypto";
import { audit as afendaAudit } from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	eq,
	payrollCalendar,
	payrollDeductionRule,
	payrollEarningRule,
	payrollPayGroup,
	payrollPeriod,
	payrollRuleFinalizedUsage,
	payrollStatutoryRule,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";

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
import { payrollJsonObjectSchema } from "../../schemas/common";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	endSupersededEffectiveRange,
	isValidEffectiveDateRange,
} from "../../shared/effective-date";
import {
	isPostgresUniqueViolation,
	mapConflict,
	mapInvalidState,
	mapNotFound,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import { assertRuleNotLockedByFinalizedRun } from "../../shared/setup-rule-guards";
import {
	assertValidPayrollAmountRateRuleConfiguration,
	assertValidRuleSuccessorDate,
} from "../../shared/setup-rule-policy";
import type { PayrollSetupStore } from "../../store/setup";
import type {
	PayrollCalendar,
	PayrollCalendarArchiveInput,
	PayrollDeductionRule,
	PayrollEarningRule,
	PayrollPayGroup,
	PayrollPeriod,
	PayrollRuleSupersedeResult,
	PayrollStatutoryRule,
} from "../../types";

function recordAudit(
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
	return errorResult.ok({
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
	return errorResult.ok({
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
	return errorResult.ok({
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
	return errorResult.ok({
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
	return errorResult.ok({
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
	const configJson = payrollJsonObjectSchema.safeParse(row.configJson);
	if (!configJson.success) {
		return mapPersistenceFailure(
			configJson.error,
			"Persisted payroll statutory rule configuration is invalid",
		);
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		payGroupId: payGroupId.data,
		code: row.code,
		name: row.name,
		jurisdictionCode: row.jurisdictionCode,
		configJson: configJson.data,
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
			const rows = await afendaDatabase.client
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
			return errorResult.ok(rows[0] !== undefined);
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
			return mapInvalidState(
				"Payroll calendar is already in the requested status",
			);
		}

		try {
			const rows = await afendaDatabase.client
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
			const [row] = rows;
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
			return mapPersistenceFailure(
				error,
				"Failed to update payroll calendar status",
			);
		}
	}

	return {
		async listCalendars(listInput) {
			try {
				const rows = await afendaDatabase.client
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
				return errorResult.ok(calendars);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to list payroll calendars");
			}
		},

		archiveCalendar(calendarInput, ports) {
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
				const rows = await afendaDatabase.client
					.update(payrollPayGroup)
					.set({
						name: payGroupInput.name ?? current.data.name,
						currencyCode:
							payGroupInput.currencyCode ?? current.data.currencyCode,
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
				const [row] = rows;
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
				return mapPersistenceFailure(
					error,
					"Failed to update payroll pay group",
				);
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
				const rows = await afendaDatabase.client
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
				const [row] = rows;
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
				return mapPersistenceFailure(
					error,
					"Failed to archive payroll pay group",
				);
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
				const rows = await afendaDatabase.client
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
				const [row] = rows;
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
				const rows = await afendaDatabase.client
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
				const [row] = rows;
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
				const rows = await afendaDatabase.client
					.select()
					.from(payrollEarningRule)
					.where(
						and(
							eq(payrollEarningRule.organizationId, getInput.organizationId),
							eq(payrollEarningRule.id, getInput.ruleId),
						),
					)
					.limit(1);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				return mapEarningRuleRow(row);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to load payroll earning rule",
				);
			}
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Versioned rule mutation keeps lock, conflict, audit, and persistence checks together.
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
			const amount =
				ruleInput.amount === undefined ? current.data.amount : ruleInput.amount;
			const rate =
				ruleInput.rate === undefined ? current.data.rate : ruleInput.rate;
			const name = ruleInput.name ?? current.data.name;
			const effectiveTo =
				ruleInput.effectiveTo === undefined
					? current.data.effectiveTo
					: ruleInput.effectiveTo;
			const configuration = assertValidPayrollAmountRateRuleConfiguration({
				ruleType: current.data.ruleType,
				amount,
				rate,
			});
			if (!configuration.ok) {
				return configuration;
			}
			if (
				!isValidEffectiveDateRange({
					effectiveFrom: current.data.effectiveFrom,
					effectiveTo,
				})
			) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "effectiveTo must be on or after effectiveFrom",
				});
			}

			try {
				const [, rows] = await afendaDatabase.transaction((sqlValue) => [
					sqlValue`SELECT pg_advisory_xact_lock(hashtextextended(${ruleInput.organizationId}::text || ':earning:' || ${ruleInput.ruleId}::uuid::text, 0))`,
					sqlValue`
						UPDATE payroll_earning_rule
						SET name = ${name}, amount = ${amount},
							rate = ${rate}, effective_to = ${effectiveTo},
							version = version + 1, updated_by = ${ruleInput.actorUserId},
							updated_at = NOW()
						WHERE organization_id = ${ruleInput.organizationId}
							AND id = ${ruleInput.ruleId} AND version = ${ruleInput.expectedVersion}
							AND status = 'active'
							AND NOT EXISTS (
								SELECT 1 FROM payroll_rule_finalized_usage
								WHERE organization_id = ${ruleInput.organizationId}
									AND rule_kind = 'earning' AND rule_id = ${ruleInput.ruleId}
							)
						RETURNING id
					`,
				]);
				if (rows.length === 0) {
					return mapConflict("Payroll earning rule is stale or finalized");
				}
				const updated = await this.getEarningRule({
					organizationId: ruleInput.organizationId,
					ruleId: ruleInput.ruleId,
				});
				if (!updated.ok) {
					return updated;
				}
				if (updated.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_earning_rule",
					entityId: updated.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return errorResult.ok(updated.data);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to update payroll earning rule",
				);
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
				const [, rows] = await afendaDatabase.transaction((sqlValue) => [
					sqlValue`SELECT pg_advisory_xact_lock(hashtextextended(${ruleInput.organizationId}::text || ':earning:' || ${ruleInput.ruleId}::uuid::text, 0))`,
					sqlValue`
						UPDATE payroll_earning_rule
						SET status = 'archived', version = version + 1,
							updated_by = ${ruleInput.actorUserId}, updated_at = NOW()
						WHERE organization_id = ${ruleInput.organizationId}
							AND id = ${ruleInput.ruleId} AND version = ${ruleInput.expectedVersion}
							AND NOT EXISTS (
								SELECT 1 FROM payroll_rule_finalized_usage
								WHERE organization_id = ${ruleInput.organizationId}
									AND rule_kind = 'earning' AND rule_id = ${ruleInput.ruleId}
							)
						RETURNING id
					`,
				]);
				if (rows.length === 0) {
					return mapConflict("Payroll earning rule is stale or finalized");
				}
				const updated = await this.getEarningRule({
					organizationId: ruleInput.organizationId,
					ruleId: ruleInput.ruleId,
				});
				if (!updated.ok) {
					return updated;
				}
				if (updated.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_earning_rule",
					entityId: updated.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return errorResult.ok(updated.data);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to archive payroll earning rule",
				);
			}
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Rule supersession validates the semantic transition before one atomic persistence statement.
		async supersedeEarningRule(record, _ports) {
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
			const successorDate = assertValidRuleSuccessorDate({
				currentEffectiveFrom: existing.effectiveFrom,
				successorEffectiveFrom: record.effectiveFrom,
			});
			if (!successorDate.ok) {
				return successorDate;
			}
			const successorConfiguration =
				assertValidPayrollAmountRateRuleConfiguration({
					ruleType: record.ruleType ?? existing.ruleType,
					amount: record.amount === undefined ? existing.amount : record.amount,
					rate: record.rate === undefined ? existing.rate : record.rate,
				});
			if (!successorConfiguration.ok) {
				return successorConfiguration;
			}

			const successorId = parsePayrollEarningRuleId(randomUUID());
			if (!successorId.ok) {
				return successorId;
			}
			const predecessorAudit = afendaAudit.transaction.prepare({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				module: "payroll",
				entity: "payroll_earning_rule",
				entityId: record.ruleId,
				action: "UPDATE",
				oldValue: { status: existing.status, version: existing.version },
				newValue: { status: "superseded", successorId: successorId.data },
			});
			if (!predecessorAudit.ok) {
				return predecessorAudit;
			}
			const successorAudit = afendaAudit.transaction.prepare({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				module: "payroll",
				entity: "payroll_earning_rule",
				entityId: successorId.data,
				action: "CREATE",
				newValue: { status: "active", predecessorId: record.ruleId },
			});
			if (!successorAudit.ok) {
				return successorAudit;
			}
			const oldAudit = predecessorAudit.data;
			const newAudit = successorAudit.data;
			try {
				const [, rows] = await afendaDatabase.transaction((sqlValue) => [
					sqlValue`SELECT pg_advisory_xact_lock(hashtextextended(${record.organizationId}::text || ':earning:' || ${record.ruleId}::uuid::text, 0))`,
					sqlValue`
						WITH superseded AS (
							UPDATE payroll_earning_rule
							SET status = 'superseded',
								effective_to = ${endSupersededEffectiveRange(existing.effectiveTo, record.effectiveFrom)},
								version = version + 1, updated_by = ${record.createdBy}, updated_at = NOW()
							WHERE organization_id = ${record.organizationId}
								AND id = ${record.ruleId} AND version = ${record.expectedVersion}
								AND status = 'active'
								AND NOT EXISTS (
									SELECT 1 FROM payroll_rule_finalized_usage
									WHERE organization_id = ${record.organizationId}
										AND rule_kind = 'earning' AND rule_id = ${record.ruleId}
								)
							RETURNING id
						), successor AS (
							INSERT INTO payroll_earning_rule (
								id, organization_id, pay_group_id, code, name, rule_type,
								amount, rate, currency_code, rule_version, status,
								effective_from, effective_to, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT ${successorId.data}, ${record.organizationId}, ${existing.payGroupId},
								${existing.code}, ${record.name ?? existing.name},
								${record.ruleType ?? existing.ruleType},
								${record.amount === undefined ? existing.amount : record.amount},
								${record.rate === undefined ? existing.rate : record.rate},
								${record.currencyCode ?? existing.currencyCode}, ${record.ruleVersion},
								'active', ${record.effectiveFrom}, ${record.effectiveTo ?? null},
								${record.idempotencyKey}, ${record.createRequestFingerprint}, 1,
								${record.createdBy}, ${record.createdBy}
							FROM superseded RETURNING id
						), predecessor_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes, old_value, new_value,
								metadata, ip_address, user_agent
							)
							SELECT ${randomUUID()}, ${oldAudit.organizationId}, ${oldAudit.actorUserId},
								${oldAudit.correlationId}, ${oldAudit.module}, ${oldAudit.entity},
								${oldAudit.entityId}, ${oldAudit.action}, ${oldAudit.changesJson}::jsonb,
								${oldAudit.oldValueJson}::jsonb, ${oldAudit.newValueJson}::jsonb,
								${oldAudit.metadataJson}::jsonb, ${oldAudit.ipAddress}, ${oldAudit.userAgent}
							FROM successor
							RETURNING id
						), successor_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes, old_value, new_value,
								metadata, ip_address, user_agent
							)
							SELECT ${randomUUID()}, ${newAudit.organizationId}, ${newAudit.actorUserId},
								${newAudit.correlationId}, ${newAudit.module}, ${newAudit.entity},
								${newAudit.entityId}, ${newAudit.action}, ${newAudit.changesJson}::jsonb,
								${newAudit.oldValueJson}::jsonb, ${newAudit.newValueJson}::jsonb,
								${newAudit.metadataJson}::jsonb, ${newAudit.ipAddress}, ${newAudit.userAgent}
							FROM successor
							RETURNING id
						)
						SELECT superseded.id AS superseded_id, successor.id AS successor_id
						FROM superseded CROSS JOIN successor
							CROSS JOIN predecessor_audited CROSS JOIN successor_audited
					`,
				]);
				if (rows.length === 0) {
					return mapConflict("Payroll earning rule is stale or finalized");
				}
				const superseded = await this.getEarningRule({
					organizationId: record.organizationId,
					ruleId: record.ruleId,
				});
				const successor = await this.getEarningRule({
					organizationId: record.organizationId,
					ruleId: successorId.data,
				});
				if (!superseded.ok) {
					return superseded;
				}
				if (!successor.ok) {
					return successor;
				}
				if (superseded.data === null || successor.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				return errorResult.ok({
					superseded: superseded.data,
					successor: successor.data,
				} satisfies PayrollRuleSupersedeResult<PayrollEarningRule>);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to supersede payroll earning rule",
				);
			}
		},

		async getDeductionRule(getInput) {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(payrollDeductionRule)
					.where(
						and(
							eq(payrollDeductionRule.organizationId, getInput.organizationId),
							eq(payrollDeductionRule.id, getInput.ruleId),
						),
					)
					.limit(1);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				return mapDeductionRuleRow(row);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to load payroll deduction rule",
				);
			}
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Versioned rule mutation keeps lock, conflict, audit, and persistence checks together.
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
			const amount =
				ruleInput.amount === undefined ? current.data.amount : ruleInput.amount;
			const rate =
				ruleInput.rate === undefined ? current.data.rate : ruleInput.rate;
			const name = ruleInput.name ?? current.data.name;
			const taxTiming = ruleInput.taxTiming ?? current.data.taxTiming;
			const effectiveTo =
				ruleInput.effectiveTo === undefined
					? current.data.effectiveTo
					: ruleInput.effectiveTo;
			const configuration = assertValidPayrollAmountRateRuleConfiguration({
				ruleType: current.data.ruleType,
				amount,
				rate,
			});
			if (!configuration.ok) {
				return configuration;
			}
			if (
				!isValidEffectiveDateRange({
					effectiveFrom: current.data.effectiveFrom,
					effectiveTo,
				})
			) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "effectiveTo must be on or after effectiveFrom",
				});
			}

			try {
				const [, rows] = await afendaDatabase.transaction((sqlValue) => [
					sqlValue`SELECT pg_advisory_xact_lock(hashtextextended(${ruleInput.organizationId}::text || ':deduction:' || ${ruleInput.ruleId}::uuid::text, 0))`,
					sqlValue`
						UPDATE payroll_deduction_rule
						SET name = ${name}, amount = ${amount},
							rate = ${rate}, tax_timing = ${taxTiming},
							effective_to = ${effectiveTo}, version = version + 1,
							updated_by = ${ruleInput.actorUserId}, updated_at = NOW()
						WHERE organization_id = ${ruleInput.organizationId}
							AND id = ${ruleInput.ruleId} AND version = ${ruleInput.expectedVersion}
							AND status = 'active'
							AND NOT EXISTS (
								SELECT 1 FROM payroll_rule_finalized_usage
								WHERE organization_id = ${ruleInput.organizationId}
									AND rule_kind = 'deduction' AND rule_id = ${ruleInput.ruleId}
							)
						RETURNING id
					`,
				]);
				if (rows.length === 0) {
					return mapConflict("Payroll deduction rule is stale or finalized");
				}
				const updated = await this.getDeductionRule({
					organizationId: ruleInput.organizationId,
					ruleId: ruleInput.ruleId,
				});
				if (!updated.ok) {
					return updated;
				}
				if (updated.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_deduction_rule",
					entityId: updated.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return errorResult.ok(updated.data);
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
				const [, rows] = await afendaDatabase.transaction((sqlValue) => [
					sqlValue`SELECT pg_advisory_xact_lock(hashtextextended(${ruleInput.organizationId}::text || ':deduction:' || ${ruleInput.ruleId}::uuid::text, 0))`,
					sqlValue`
						UPDATE payroll_deduction_rule
						SET status = 'archived', version = version + 1,
							updated_by = ${ruleInput.actorUserId}, updated_at = NOW()
						WHERE organization_id = ${ruleInput.organizationId}
							AND id = ${ruleInput.ruleId} AND version = ${ruleInput.expectedVersion}
							AND NOT EXISTS (
								SELECT 1 FROM payroll_rule_finalized_usage
								WHERE organization_id = ${ruleInput.organizationId}
									AND rule_kind = 'deduction' AND rule_id = ${ruleInput.ruleId}
							)
						RETURNING id
					`,
				]);
				if (rows.length === 0) {
					return mapConflict("Payroll deduction rule is stale or finalized");
				}
				const updated = await this.getDeductionRule({
					organizationId: ruleInput.organizationId,
					ruleId: ruleInput.ruleId,
				});
				if (!updated.ok) {
					return updated;
				}
				if (updated.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_deduction_rule",
					entityId: updated.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return errorResult.ok(updated.data);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to archive payroll deduction rule",
				);
			}
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Rule supersession validates the semantic transition before one atomic persistence statement.
		async supersedeDeductionRule(record, _ports) {
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
			const successorDate = assertValidRuleSuccessorDate({
				currentEffectiveFrom: existing.effectiveFrom,
				successorEffectiveFrom: record.effectiveFrom,
			});
			if (!successorDate.ok) {
				return successorDate;
			}
			const successorConfiguration =
				assertValidPayrollAmountRateRuleConfiguration({
					ruleType: record.ruleType ?? existing.ruleType,
					amount: record.amount === undefined ? existing.amount : record.amount,
					rate: record.rate === undefined ? existing.rate : record.rate,
				});
			if (!successorConfiguration.ok) {
				return successorConfiguration;
			}

			const successorId = parsePayrollDeductionRuleId(randomUUID());
			if (!successorId.ok) {
				return successorId;
			}
			const predecessorAudit = afendaAudit.transaction.prepare({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				module: "payroll",
				entity: "payroll_deduction_rule",
				entityId: record.ruleId,
				action: "UPDATE",
				oldValue: { status: existing.status, version: existing.version },
				newValue: { status: "superseded", successorId: successorId.data },
			});
			if (!predecessorAudit.ok) {
				return predecessorAudit;
			}
			const successorAudit = afendaAudit.transaction.prepare({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				module: "payroll",
				entity: "payroll_deduction_rule",
				entityId: successorId.data,
				action: "CREATE",
				newValue: { status: "active", predecessorId: record.ruleId },
			});
			if (!successorAudit.ok) {
				return successorAudit;
			}
			const oldAudit = predecessorAudit.data;
			const newAudit = successorAudit.data;
			try {
				const [, rows] = await afendaDatabase.transaction((sqlValue) => [
					sqlValue`SELECT pg_advisory_xact_lock(hashtextextended(${record.organizationId}::text || ':deduction:' || ${record.ruleId}::uuid::text, 0))`,
					sqlValue`
					WITH superseded AS (
						UPDATE payroll_deduction_rule
						SET status = 'superseded',
							effective_to = ${endSupersededEffectiveRange(existing.effectiveTo, record.effectiveFrom)},
							version = version + 1, updated_by = ${record.createdBy}, updated_at = NOW()
						WHERE organization_id = ${record.organizationId}
							AND id = ${record.ruleId} AND version = ${record.expectedVersion}
							AND status = 'active'
							AND NOT EXISTS (
								SELECT 1 FROM payroll_rule_finalized_usage
								WHERE organization_id = ${record.organizationId}
									AND rule_kind = 'deduction' AND rule_id = ${record.ruleId}
							)
						RETURNING id
					), successor AS (
						INSERT INTO payroll_deduction_rule (
							id, organization_id, pay_group_id, code, name, rule_type,
							amount, rate, currency_code, tax_timing, rule_version, status,
							effective_from, effective_to, create_idempotency_key,
							create_request_fingerprint, version, created_by, updated_by
						)
						SELECT ${successorId.data}, ${record.organizationId}, ${existing.payGroupId},
							${existing.code}, ${record.name ?? existing.name},
							${record.ruleType ?? existing.ruleType},
							${record.amount === undefined ? existing.amount : record.amount},
							${record.rate === undefined ? existing.rate : record.rate},
							${record.currencyCode ?? existing.currencyCode},
							${record.taxTiming ?? existing.taxTiming}, ${record.ruleVersion}, 'active',
							${record.effectiveFrom}, ${record.effectiveTo ?? null},
							${record.idempotencyKey}, ${record.createRequestFingerprint}, 1,
							${record.createdBy}, ${record.createdBy}
						FROM superseded RETURNING id
					), predecessor_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${randomUUID()}, ${oldAudit.organizationId}, ${oldAudit.actorUserId},
							${oldAudit.correlationId}, ${oldAudit.module}, ${oldAudit.entity},
							${oldAudit.entityId}, ${oldAudit.action}, ${oldAudit.changesJson}::jsonb,
							${oldAudit.oldValueJson}::jsonb, ${oldAudit.newValueJson}::jsonb,
							${oldAudit.metadataJson}::jsonb, ${oldAudit.ipAddress}, ${oldAudit.userAgent}
						FROM successor RETURNING id
					), successor_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${randomUUID()}, ${newAudit.organizationId}, ${newAudit.actorUserId},
							${newAudit.correlationId}, ${newAudit.module}, ${newAudit.entity},
							${newAudit.entityId}, ${newAudit.action}, ${newAudit.changesJson}::jsonb,
							${newAudit.oldValueJson}::jsonb, ${newAudit.newValueJson}::jsonb,
							${newAudit.metadataJson}::jsonb, ${newAudit.ipAddress}, ${newAudit.userAgent}
						FROM successor RETURNING id
					)
					SELECT superseded.id AS superseded_id, successor.id AS successor_id
					FROM superseded CROSS JOIN successor
						CROSS JOIN predecessor_audited CROSS JOIN successor_audited
				`,
				]);
				if (rows.length === 0) {
					return mapConflict("Payroll deduction rule is stale or finalized");
				}
				const superseded = await this.getDeductionRule({
					organizationId: record.organizationId,
					ruleId: record.ruleId,
				});
				const successor = await this.getDeductionRule({
					organizationId: record.organizationId,
					ruleId: successorId.data,
				});
				if (!superseded.ok) {
					return superseded;
				}
				if (!successor.ok) {
					return successor;
				}
				if (superseded.data === null || successor.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				return errorResult.ok({
					superseded: superseded.data,
					successor: successor.data,
				} satisfies PayrollRuleSupersedeResult<PayrollDeductionRule>);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to supersede payroll deduction rule",
				);
			}
		},

		async getStatutoryRule(getInput) {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(payrollStatutoryRule)
					.where(
						and(
							eq(payrollStatutoryRule.organizationId, getInput.organizationId),
							eq(payrollStatutoryRule.id, getInput.ruleId),
						),
					)
					.limit(1);
				const [row] = rows;
				if (row === undefined) {
					return errorResult.ok(null);
				}
				return mapStatutoryRuleRow(row);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to load payroll statutory rule",
				);
			}
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Versioned rule mutation keeps lock, conflict, audit, and persistence checks together.
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
			const effectiveTo =
				ruleInput.effectiveTo === undefined
					? current.data.effectiveTo
					: ruleInput.effectiveTo;
			const name = ruleInput.name ?? current.data.name;
			const jurisdictionCode =
				ruleInput.jurisdictionCode ?? current.data.jurisdictionCode;
			const nextConfigJson = ruleInput.configJson ?? current.data.configJson;
			if (
				!isValidEffectiveDateRange({
					effectiveFrom: current.data.effectiveFrom,
					effectiveTo,
				})
			) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "effectiveTo must be on or after effectiveFrom",
				});
			}

			try {
				const configJson = JSON.stringify(nextConfigJson);
				const [, rows] = await afendaDatabase.transaction((sqlValue) => [
					sqlValue`SELECT pg_advisory_xact_lock(hashtextextended(${ruleInput.organizationId}::text || ':statutory:' || ${ruleInput.ruleId}::uuid::text, 0))`,
					sqlValue`
						UPDATE payroll_statutory_rule
						SET name = ${name}, jurisdiction_code = ${jurisdictionCode},
							config_json = ${configJson}::jsonb, effective_to = ${effectiveTo},
							version = version + 1, updated_by = ${ruleInput.actorUserId},
							updated_at = NOW()
						WHERE organization_id = ${ruleInput.organizationId}
							AND id = ${ruleInput.ruleId} AND version = ${ruleInput.expectedVersion}
							AND status = 'active'
							AND NOT EXISTS (
								SELECT 1 FROM payroll_rule_finalized_usage
								WHERE organization_id = ${ruleInput.organizationId}
									AND rule_kind = 'statutory' AND rule_id = ${ruleInput.ruleId}
							)
						RETURNING id
					`,
				]);
				if (rows.length === 0) {
					return mapConflict("Payroll statutory rule is stale or finalized");
				}
				const updated = await this.getStatutoryRule({
					organizationId: ruleInput.organizationId,
					ruleId: ruleInput.ruleId,
				});
				if (!updated.ok) {
					return updated;
				}
				if (updated.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_statutory_rule",
					entityId: updated.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return errorResult.ok(updated.data);
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
				const [, rows] = await afendaDatabase.transaction((sqlValue) => [
					sqlValue`SELECT pg_advisory_xact_lock(hashtextextended(${ruleInput.organizationId}::text || ':statutory:' || ${ruleInput.ruleId}::uuid::text, 0))`,
					sqlValue`
						UPDATE payroll_statutory_rule
						SET status = 'archived', version = version + 1,
							updated_by = ${ruleInput.actorUserId}, updated_at = NOW()
						WHERE organization_id = ${ruleInput.organizationId}
							AND id = ${ruleInput.ruleId} AND version = ${ruleInput.expectedVersion}
							AND NOT EXISTS (
								SELECT 1 FROM payroll_rule_finalized_usage
								WHERE organization_id = ${ruleInput.organizationId}
									AND rule_kind = 'statutory' AND rule_id = ${ruleInput.ruleId}
							)
						RETURNING id
					`,
				]);
				if (rows.length === 0) {
					return mapConflict("Payroll statutory rule is stale or finalized");
				}
				const updated = await this.getStatutoryRule({
					organizationId: ruleInput.organizationId,
					ruleId: ruleInput.ruleId,
				});
				if (!updated.ok) {
					return updated;
				}
				if (updated.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}

				const audit = await recordAudit(ports, {
					organizationId: ruleInput.organizationId,
					actorUserId: ruleInput.actorUserId,
					correlationId: ruleInput.correlationId,
					entity: "payroll_statutory_rule",
					entityId: updated.data.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					return audit;
				}

				return errorResult.ok(updated.data);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to archive payroll statutory rule",
				);
			}
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Rule supersession validates the semantic transition before one atomic persistence statement.
		async supersedeStatutoryRule(record, _ports) {
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
			const successorDate = assertValidRuleSuccessorDate({
				currentEffectiveFrom: existing.effectiveFrom,
				successorEffectiveFrom: record.effectiveFrom,
			});
			if (!successorDate.ok) {
				return successorDate;
			}

			const successorId = parsePayrollStatutoryRuleId(randomUUID());
			if (!successorId.ok) {
				return successorId;
			}
			const predecessorAudit = afendaAudit.transaction.prepare({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				module: "payroll",
				entity: "payroll_statutory_rule",
				entityId: record.ruleId,
				action: "UPDATE",
				oldValue: { status: existing.status, version: existing.version },
				newValue: { status: "superseded", successorId: successorId.data },
			});
			if (!predecessorAudit.ok) {
				return predecessorAudit;
			}
			const successorAudit = afendaAudit.transaction.prepare({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				module: "payroll",
				entity: "payroll_statutory_rule",
				entityId: successorId.data,
				action: "CREATE",
				newValue: { status: "active", predecessorId: record.ruleId },
			});
			if (!successorAudit.ok) {
				return successorAudit;
			}
			const oldAudit = predecessorAudit.data;
			const newAudit = successorAudit.data;
			const configJson = JSON.stringify(
				record.configJson ?? existing.configJson,
			);
			try {
				const [, rows] = await afendaDatabase.transaction((sqlValue) => [
					sqlValue`SELECT pg_advisory_xact_lock(hashtextextended(${record.organizationId}::text || ':statutory:' || ${record.ruleId}::uuid::text, 0))`,
					sqlValue`
					WITH superseded AS (
						UPDATE payroll_statutory_rule
						SET status = 'superseded',
							effective_to = ${endSupersededEffectiveRange(existing.effectiveTo, record.effectiveFrom)},
							version = version + 1, updated_by = ${record.createdBy}, updated_at = NOW()
						WHERE organization_id = ${record.organizationId}
							AND id = ${record.ruleId} AND version = ${record.expectedVersion}
							AND status = 'active'
							AND NOT EXISTS (
								SELECT 1 FROM payroll_rule_finalized_usage
								WHERE organization_id = ${record.organizationId}
									AND rule_kind = 'statutory' AND rule_id = ${record.ruleId}
							)
						RETURNING id
					), successor AS (
						INSERT INTO payroll_statutory_rule (
							id, organization_id, pay_group_id, code, name, jurisdiction_code,
							config_json, rule_version, status, effective_from, effective_to,
							create_idempotency_key, create_request_fingerprint, version,
							created_by, updated_by
						)
						SELECT ${successorId.data}, ${record.organizationId}, ${existing.payGroupId},
							${existing.code}, ${record.name ?? existing.name},
							${record.jurisdictionCode ?? existing.jurisdictionCode},
							${configJson}::jsonb, ${record.ruleVersion}, 'active',
							${record.effectiveFrom}, ${record.effectiveTo ?? null},
							${record.idempotencyKey}, ${record.createRequestFingerprint}, 1,
							${record.createdBy}, ${record.createdBy}
						FROM superseded RETURNING id
					), predecessor_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${randomUUID()}, ${oldAudit.organizationId}, ${oldAudit.actorUserId},
							${oldAudit.correlationId}, ${oldAudit.module}, ${oldAudit.entity},
							${oldAudit.entityId}, ${oldAudit.action}, ${oldAudit.changesJson}::jsonb,
							${oldAudit.oldValueJson}::jsonb, ${oldAudit.newValueJson}::jsonb,
							${oldAudit.metadataJson}::jsonb, ${oldAudit.ipAddress}, ${oldAudit.userAgent}
						FROM successor RETURNING id
					), successor_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${randomUUID()}, ${newAudit.organizationId}, ${newAudit.actorUserId},
							${newAudit.correlationId}, ${newAudit.module}, ${newAudit.entity},
							${newAudit.entityId}, ${newAudit.action}, ${newAudit.changesJson}::jsonb,
							${newAudit.oldValueJson}::jsonb, ${newAudit.newValueJson}::jsonb,
							${newAudit.metadataJson}::jsonb, ${newAudit.ipAddress}, ${newAudit.userAgent}
						FROM successor RETURNING id
					)
					SELECT superseded.id AS superseded_id, successor.id AS successor_id
					FROM superseded CROSS JOIN successor
						CROSS JOIN predecessor_audited CROSS JOIN successor_audited
				`,
				]);
				if (rows.length === 0) {
					return mapConflict("Payroll statutory rule is stale or finalized");
				}
				const superseded = await this.getStatutoryRule({
					organizationId: record.organizationId,
					ruleId: record.ruleId,
				});
				const successor = await this.getStatutoryRule({
					organizationId: record.organizationId,
					ruleId: successorId.data,
				});
				if (!superseded.ok) {
					return superseded;
				}
				if (!successor.ok) {
					return successor;
				}
				if (superseded.data === null || successor.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				return errorResult.ok({
					superseded: superseded.data,
					successor: successor.data,
				} satisfies PayrollRuleSupersedeResult<PayrollStatutoryRule>);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to supersede payroll statutory rule",
				);
			}
		},

		async recordRuleVersionUsedByFinalizedRun(usageInput) {
			const runId = parsePayrollRunId(usageInput.runId);
			if (!runId.ok) {
				return runId;
			}

			try {
				await afendaDatabase.client.insert(payrollRuleFinalizedUsage).values({
					organizationId: usageInput.organizationId,
					ruleKind: usageInput.ruleKind,
					ruleId: usageInput.ruleId,
					runId: runId.data,
				});
				return errorResult.ok({ recorded: true as const });
			} catch (error) {
				if (isPostgresUniqueViolation(error)) {
					return errorResult.ok({ recorded: true as const });
				}
				return mapPersistenceFailure(
					error,
					"Failed to record payroll rule finalized usage",
				);
			}
		},

		isRuleVersionUsedByFinalizedRun(checkInput) {
			return queryRuleFinalizedUsage(checkInput);
		},
	};
}
