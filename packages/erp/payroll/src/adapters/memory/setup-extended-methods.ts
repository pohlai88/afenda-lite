import { randomUUID } from "node:crypto";
import { ok, type Result } from "@afenda/errors/result";

import {
	type PayrollCalendarId,
	type PayrollDeductionRuleId,
	type PayrollEarningRuleId,
	type PayrollPayGroupId,
	type PayrollPeriodId,
	type PayrollStatutoryRuleId,
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
import { assertRuleNotLockedByFinalizedRun } from "../../shared/setup-rule-guards";
import {
	ruleFinalizedUsageKey,
	type PayrollRuleFinalizedUsageCheck,
	type PayrollRuleFinalizedUsageInput,
	type PayrollRuleKind,
} from "../../shared/rule-finalized-lock";
import { mapInvalidState, mapNotFound } from "../../shared/persistence-errors";
import type { PayrollSetupStore } from "../../store/setup";
import type {
	PayrollCalendar,
	PayrollCalendarArchiveInput,
	PayrollCalendarUpdateInput,
	PayrollDeductionRule,
	PayrollDeductionRuleArchiveInput,
	PayrollDeductionRuleSupersedeRecord,
	PayrollDeductionRuleUpdateInput,
	PayrollEarningRule,
	PayrollEarningRuleArchiveInput,
	PayrollEarningRuleSupersedeRecord,
	PayrollEarningRuleUpdateInput,
	PayrollPayGroup,
	PayrollPayGroupArchiveInput,
	PayrollPayGroupUpdateInput,
	PayrollPeriod,
	PayrollPeriodCloseInput,
	PayrollPeriodUpdateInput,
	PayrollRuleSupersedeResult,
	PayrollStatutoryRule,
	PayrollStatutoryRuleArchiveInput,
	PayrollStatutoryRuleSupersedeRecord,
	PayrollStatutoryRuleUpdateInput,
} from "../../types";
import type { SetupMemoryState } from "./state";

type AuditFn = (
	ports: MutationPorts,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
	},
) => Promise<Result<{ id: string }>>;

export function createMemorySetupExtendedMethods(input: {
	state: SetupMemoryState;
	recordAudit: AuditFn;
	cloneCalendar: (calendar: PayrollCalendar) => PayrollCalendar;
	clonePayGroup: (payGroup: PayrollPayGroup) => PayrollPayGroup;
	clonePeriod: (period: PayrollPeriod) => PayrollPeriod;
	cloneEarningRule: (rule: PayrollEarningRule) => PayrollEarningRule;
	cloneDeductionRule: (rule: PayrollDeductionRule) => PayrollDeductionRule;
	cloneStatutoryRule: (rule: PayrollStatutoryRule) => PayrollStatutoryRule;
	host: PayrollSetupStore;
}): Pick<
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
	const {
		state,
		recordAudit,
		cloneCalendar,
		clonePayGroup,
		clonePeriod,
		cloneEarningRule,
		cloneDeductionRule,
		cloneStatutoryRule,
		host,
	} = input;

	const ruleLockStore: Pick<
		PayrollSetupStore,
		"isRuleVersionUsedByFinalizedRun"
	> = {
		async isRuleVersionUsedByFinalizedRun(checkInput) {
			return ok(state.ruleFinalizedUsage.has(ruleFinalizedUsageKey(checkInput)));
		},
	};

	async function transitionCalendarStatus(
		calendarInput: PayrollCalendarArchiveInput,
		nextStatus: PayrollCalendar["status"],
		ports: MutationPorts,
	): Promise<Result<PayrollCalendar>> {
		const calendar = state.calendars.get(calendarInput.calendarId);
		if (
			calendar === undefined ||
			calendar.organizationId !== calendarInput.organizationId
		) {
			return mapNotFound("Payroll calendar not found");
		}
		const versionCheck = assertExpectedVersion(
			calendar.version,
			calendarInput.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (calendar.status === nextStatus) {
			return mapInvalidState("Payroll calendar is already in the requested status");
		}

		const now = new Date();
		const updated: PayrollCalendar = {
			...calendar,
			status: nextStatus,
			version: calendar.version + 1,
			updatedBy: calendarInput.actorUserId,
			updatedAt: now,
		};
		state.calendars.set(updated.id, updated);

		const audit = await recordAudit(ports, {
			organizationId: calendarInput.organizationId,
			actorUserId: calendarInput.actorUserId,
			correlationId: calendarInput.correlationId,
			entity: "payroll_calendar",
			entityId: updated.id,
			action: "UPDATE",
		});
		if (!audit.ok) {
			state.calendars.set(calendar.id, calendar);
			return audit;
		}
		return ok(cloneCalendar(updated));
	}

	return {
		async listCalendars(listInput) {
			const calendars = Array.from(state.calendars.values()).filter(
				(calendar) => {
					if (calendar.organizationId !== listInput.organizationId) {
						return false;
					}
					if (
						listInput.status !== undefined &&
						calendar.status !== listInput.status
					) {
						return false;
					}
					return true;
				},
			);
			return ok(calendars.map(cloneCalendar));
		},

		async archiveCalendar(calendarInput, ports) {
			return transitionCalendarStatus(calendarInput, "archived", ports);
		},

		async updatePayGroup(payGroupInput, ports) {
			const payGroup = state.payGroups.get(payGroupInput.payGroupId);
			if (
				payGroup === undefined ||
				payGroup.organizationId !== payGroupInput.organizationId
			) {
				return mapNotFound("Payroll pay group not found");
			}
			const versionCheck = assertExpectedVersion(
				payGroup.version,
				payGroupInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (payGroup.status === "archived") {
				return mapInvalidState("Archived pay groups cannot be updated");
			}

			const now = new Date();
			const updated: PayrollPayGroup = {
				...payGroup,
				name: payGroupInput.name ?? payGroup.name,
				currencyCode: payGroupInput.currencyCode ?? payGroup.currencyCode,
				version: payGroup.version + 1,
				updatedBy: payGroupInput.actorUserId,
				updatedAt: now,
			};
			state.payGroups.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: payGroupInput.organizationId,
				actorUserId: payGroupInput.actorUserId,
				correlationId: payGroupInput.correlationId,
				entity: "payroll_pay_group",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.payGroups.set(payGroup.id, payGroup);
				return audit;
			}
			return ok(clonePayGroup(updated));
		},

		async archivePayGroup(payGroupInput, ports) {
			const payGroup = state.payGroups.get(payGroupInput.payGroupId);
			if (
				payGroup === undefined ||
				payGroup.organizationId !== payGroupInput.organizationId
			) {
				return mapNotFound("Payroll pay group not found");
			}
			const versionCheck = assertExpectedVersion(
				payGroup.version,
				payGroupInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (payGroup.status === "archived") {
				return mapInvalidState("Payroll pay group is already archived");
			}

			const now = new Date();
			const updated: PayrollPayGroup = {
				...payGroup,
				status: "archived",
				version: payGroup.version + 1,
				updatedBy: payGroupInput.actorUserId,
				updatedAt: now,
			};
			state.payGroups.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: payGroupInput.organizationId,
				actorUserId: payGroupInput.actorUserId,
				correlationId: payGroupInput.correlationId,
				entity: "payroll_pay_group",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.payGroups.set(payGroup.id, payGroup);
				return audit;
			}
			return ok(clonePayGroup(updated));
		},

		async updatePeriod(periodInput, ports) {
			const period = state.periods.get(periodInput.periodId);
			if (
				period === undefined ||
				period.organizationId !== periodInput.organizationId
			) {
				return mapNotFound("Payroll period not found");
			}
			const versionCheck = assertExpectedVersion(
				period.version,
				periodInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (period.status === "closed") {
				return mapInvalidState("Closed payroll periods cannot be updated");
			}

			const now = new Date();
			const updated: PayrollPeriod = {
				...period,
				cutoffDate: periodInput.cutoffDate ?? period.cutoffDate,
				version: period.version + 1,
				updatedBy: periodInput.actorUserId,
				updatedAt: now,
			};
			state.periods.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: periodInput.organizationId,
				actorUserId: periodInput.actorUserId,
				correlationId: periodInput.correlationId,
				entity: "payroll_period",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.periods.set(period.id, period);
				return audit;
			}
			return ok(clonePeriod(updated));
		},

		async closePeriod(periodInput, ports) {
			const period = state.periods.get(periodInput.periodId);
			if (
				period === undefined ||
				period.organizationId !== periodInput.organizationId
			) {
				return mapNotFound("Payroll period not found");
			}
			const versionCheck = assertExpectedVersion(
				period.version,
				periodInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (period.status === "closed") {
				return mapInvalidState("Payroll period is already closed");
			}

			const now = new Date();
			const updated: PayrollPeriod = {
				...period,
				status: "closed",
				version: period.version + 1,
				updatedBy: periodInput.actorUserId,
				updatedAt: now,
			};
			state.periods.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: periodInput.organizationId,
				actorUserId: periodInput.actorUserId,
				correlationId: periodInput.correlationId,
				entity: "payroll_period",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.periods.set(period.id, period);
				return audit;
			}
			return ok(clonePeriod(updated));
		},

		async getEarningRule(getInput) {
			const rule = state.earningRules.get(getInput.ruleId);
			if (
				rule === undefined ||
				rule.organizationId !== getInput.organizationId
			) {
				return ok(null);
			}
			return ok(cloneEarningRule(rule));
		},

		async updateEarningRule(ruleInput, ports) {
			const rule = state.earningRules.get(ruleInput.ruleId);
			if (
				rule === undefined ||
				rule.organizationId !== ruleInput.organizationId
			) {
				return mapNotFound("Payroll earning rule not found");
			}
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "earning",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}
			const versionCheck = assertExpectedVersion(
				rule.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (rule.status !== "active") {
				return mapInvalidState("Only active earning rules can be updated");
			}

			const now = new Date();
			const updated: PayrollEarningRule = {
				...rule,
				name: ruleInput.name ?? rule.name,
				amount: ruleInput.amount !== undefined ? ruleInput.amount : rule.amount,
				rate: ruleInput.rate !== undefined ? ruleInput.rate : rule.rate,
				effectiveTo:
					ruleInput.effectiveTo !== undefined
						? ruleInput.effectiveTo
						: rule.effectiveTo,
				version: rule.version + 1,
				updatedBy: ruleInput.actorUserId,
				updatedAt: now,
			};
			state.earningRules.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: ruleInput.organizationId,
				actorUserId: ruleInput.actorUserId,
				correlationId: ruleInput.correlationId,
				entity: "payroll_earning_rule",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.earningRules.set(rule.id, rule);
				return audit;
			}
			return ok(cloneEarningRule(updated));
		},

		async archiveEarningRule(ruleInput, ports) {
			const rule = state.earningRules.get(ruleInput.ruleId);
			if (
				rule === undefined ||
				rule.organizationId !== ruleInput.organizationId
			) {
				return mapNotFound("Payroll earning rule not found");
			}
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "earning",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}
			const versionCheck = assertExpectedVersion(
				rule.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (rule.status === "archived") {
				return mapInvalidState("Payroll earning rule is already archived");
			}

			const now = new Date();
			const updated: PayrollEarningRule = {
				...rule,
				status: "archived",
				version: rule.version + 1,
				updatedBy: ruleInput.actorUserId,
				updatedAt: now,
			};
			state.earningRules.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: ruleInput.organizationId,
				actorUserId: ruleInput.actorUserId,
				correlationId: ruleInput.correlationId,
				entity: "payroll_earning_rule",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.earningRules.set(rule.id, rule);
				return audit;
			}
			return ok(cloneEarningRule(updated));
		},

		async supersedeEarningRule(record, ports) {
			const existing = state.earningRules.get(record.ruleId);
			if (
				existing === undefined ||
				existing.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll earning rule not found");
			}
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: record.organizationId,
				ruleKind: "earning",
				ruleId: record.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}
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

			const now = new Date();
			const superseded: PayrollEarningRule = {
				...existing,
				status: "superseded",
				version: existing.version + 1,
				updatedBy: record.createdBy,
				updatedAt: now,
			};
			state.earningRules.set(superseded.id, superseded);

			const successorResult = await host.createEarningRule(
				{
					organizationId: record.organizationId,
					payGroupId: existing.payGroupId,
					code: existing.code,
					name: record.name ?? existing.name,
					ruleType: record.ruleType ?? existing.ruleType,
					amount:
						record.amount !== undefined ? record.amount : existing.amount,
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
				state.earningRules.set(existing.id, existing);
				return successorResult;
			}

			return ok({
				superseded: cloneEarningRule(superseded),
				successor: successorResult.data,
			} satisfies PayrollRuleSupersedeResult<PayrollEarningRule>);
		},

		async getDeductionRule(getInput) {
			const rule = state.deductionRules.get(getInput.ruleId);
			if (
				rule === undefined ||
				rule.organizationId !== getInput.organizationId
			) {
				return ok(null);
			}
			return ok(cloneDeductionRule(rule));
		},

		async updateDeductionRule(ruleInput, ports) {
			const rule = state.deductionRules.get(ruleInput.ruleId);
			if (
				rule === undefined ||
				rule.organizationId !== ruleInput.organizationId
			) {
				return mapNotFound("Payroll deduction rule not found");
			}
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "deduction",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}
			const versionCheck = assertExpectedVersion(
				rule.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (rule.status !== "active") {
				return mapInvalidState("Only active deduction rules can be updated");
			}

			const now = new Date();
			const updated: PayrollDeductionRule = {
				...rule,
				name: ruleInput.name ?? rule.name,
				amount: ruleInput.amount !== undefined ? ruleInput.amount : rule.amount,
				rate: ruleInput.rate !== undefined ? ruleInput.rate : rule.rate,
				taxTiming:
					ruleInput.taxTiming !== undefined ? ruleInput.taxTiming : rule.taxTiming,
				effectiveTo:
					ruleInput.effectiveTo !== undefined
						? ruleInput.effectiveTo
						: rule.effectiveTo,
				version: rule.version + 1,
				updatedBy: ruleInput.actorUserId,
				updatedAt: now,
			};
			state.deductionRules.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: ruleInput.organizationId,
				actorUserId: ruleInput.actorUserId,
				correlationId: ruleInput.correlationId,
				entity: "payroll_deduction_rule",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.deductionRules.set(rule.id, rule);
				return audit;
			}
			return ok(cloneDeductionRule(updated));
		},

		async archiveDeductionRule(ruleInput, ports) {
			const rule = state.deductionRules.get(ruleInput.ruleId);
			if (
				rule === undefined ||
				rule.organizationId !== ruleInput.organizationId
			) {
				return mapNotFound("Payroll deduction rule not found");
			}
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "deduction",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}
			const versionCheck = assertExpectedVersion(
				rule.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (rule.status === "archived") {
				return mapInvalidState("Payroll deduction rule is already archived");
			}

			const now = new Date();
			const updated: PayrollDeductionRule = {
				...rule,
				status: "archived",
				version: rule.version + 1,
				updatedBy: ruleInput.actorUserId,
				updatedAt: now,
			};
			state.deductionRules.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: ruleInput.organizationId,
				actorUserId: ruleInput.actorUserId,
				correlationId: ruleInput.correlationId,
				entity: "payroll_deduction_rule",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.deductionRules.set(rule.id, rule);
				return audit;
			}
			return ok(cloneDeductionRule(updated));
		},

		async supersedeDeductionRule(record, ports) {
			const existing = state.deductionRules.get(record.ruleId);
			if (
				existing === undefined ||
				existing.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll deduction rule not found");
			}
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: record.organizationId,
				ruleKind: "deduction",
				ruleId: record.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}
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

			const now = new Date();
			const superseded: PayrollDeductionRule = {
				...existing,
				status: "superseded",
				version: existing.version + 1,
				updatedBy: record.createdBy,
				updatedAt: now,
			};
			state.deductionRules.set(superseded.id, superseded);

			const successorResult = await host.createDeductionRule(
				{
					organizationId: record.organizationId,
					payGroupId: existing.payGroupId,
					code: existing.code,
					name: record.name ?? existing.name,
					ruleType: record.ruleType ?? existing.ruleType,
					amount:
						record.amount !== undefined ? record.amount : existing.amount,
					rate: record.rate !== undefined ? record.rate : existing.rate,
					currencyCode: record.currencyCode ?? existing.currencyCode,
					ruleVersion: record.ruleVersion,
					taxTiming: record.taxTiming ?? existing.taxTiming,
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
				state.deductionRules.set(existing.id, existing);
				return successorResult;
			}

			return ok({
				superseded: cloneDeductionRule(superseded),
				successor: successorResult.data,
			} satisfies PayrollRuleSupersedeResult<PayrollDeductionRule>);
		},

		async getStatutoryRule(getInput) {
			const rule = state.statutoryRules.get(getInput.ruleId);
			if (
				rule === undefined ||
				rule.organizationId !== getInput.organizationId
			) {
				return ok(null);
			}
			return ok(cloneStatutoryRule(rule));
		},

		async updateStatutoryRule(ruleInput, ports) {
			const rule = state.statutoryRules.get(ruleInput.ruleId);
			if (
				rule === undefined ||
				rule.organizationId !== ruleInput.organizationId
			) {
				return mapNotFound("Payroll statutory rule not found");
			}
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "statutory",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}
			const versionCheck = assertExpectedVersion(
				rule.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (rule.status !== "active") {
				return mapInvalidState("Only active statutory rules can be updated");
			}

			const now = new Date();
			const updated: PayrollStatutoryRule = {
				...rule,
				name: ruleInput.name ?? rule.name,
				jurisdictionCode:
					ruleInput.jurisdictionCode ?? rule.jurisdictionCode,
				configJson: ruleInput.configJson ?? rule.configJson,
				effectiveTo:
					ruleInput.effectiveTo !== undefined
						? ruleInput.effectiveTo
						: rule.effectiveTo,
				version: rule.version + 1,
				updatedBy: ruleInput.actorUserId,
				updatedAt: now,
			};
			state.statutoryRules.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: ruleInput.organizationId,
				actorUserId: ruleInput.actorUserId,
				correlationId: ruleInput.correlationId,
				entity: "payroll_statutory_rule",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.statutoryRules.set(rule.id, rule);
				return audit;
			}
			return ok(cloneStatutoryRule(updated));
		},

		async archiveStatutoryRule(ruleInput, ports) {
			const rule = state.statutoryRules.get(ruleInput.ruleId);
			if (
				rule === undefined ||
				rule.organizationId !== ruleInput.organizationId
			) {
				return mapNotFound("Payroll statutory rule not found");
			}
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: ruleInput.organizationId,
				ruleKind: "statutory",
				ruleId: ruleInput.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}
			const versionCheck = assertExpectedVersion(
				rule.version,
				ruleInput.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (rule.status === "archived") {
				return mapInvalidState("Payroll statutory rule is already archived");
			}

			const now = new Date();
			const updated: PayrollStatutoryRule = {
				...rule,
				status: "archived",
				version: rule.version + 1,
				updatedBy: ruleInput.actorUserId,
				updatedAt: now,
			};
			state.statutoryRules.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: ruleInput.organizationId,
				actorUserId: ruleInput.actorUserId,
				correlationId: ruleInput.correlationId,
				entity: "payroll_statutory_rule",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.statutoryRules.set(rule.id, rule);
				return audit;
			}
			return ok(cloneStatutoryRule(updated));
		},

		async supersedeStatutoryRule(record, ports) {
			const existing = state.statutoryRules.get(record.ruleId);
			if (
				existing === undefined ||
				existing.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll statutory rule not found");
			}
			const locked = await assertRuleNotLockedByFinalizedRun(ruleLockStore, {
				organizationId: record.organizationId,
				ruleKind: "statutory",
				ruleId: record.ruleId,
			});
			if (!locked.ok) {
				return locked;
			}
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

			const now = new Date();
			const superseded: PayrollStatutoryRule = {
				...existing,
				status: "superseded",
				version: existing.version + 1,
				updatedBy: record.createdBy,
				updatedAt: now,
			};
			state.statutoryRules.set(superseded.id, superseded);

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
				state.statutoryRules.set(existing.id, existing);
				return successorResult;
			}

			return ok({
				superseded: cloneStatutoryRule(superseded),
				successor: successorResult.data,
			} satisfies PayrollRuleSupersedeResult<PayrollStatutoryRule>);
		},

		async recordRuleVersionUsedByFinalizedRun(usageInput) {
			const runId = parsePayrollRunId(usageInput.runId);
			if (!runId.ok) {
				return runId;
			}
			state.ruleFinalizedUsage.add(ruleFinalizedUsageKey(usageInput));
			return ok({ recorded: true as const });
		},

		async isRuleVersionUsedByFinalizedRun(checkInput) {
			return ok(state.ruleFinalizedUsage.has(ruleFinalizedUsageKey(checkInput)));
		},
	};
}
