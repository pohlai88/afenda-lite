import { randomUUID } from "node:crypto";
import { fail, ok, type Result } from "@afenda/errors/result";

import {
	type PayrollCalendarId,
	type PayrollPayGroupId,
	type PayrollPeriodId,
	parsePayrollCalendarId,
	parsePayrollDeductionRuleId,
	parsePayrollEarningRuleId,
	parsePayrollPayGroupId,
	parsePayrollPeriodId,
	parsePayrollStatutoryRuleId,
} from "../../brands";
import {
	PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP,
	payrollErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	effectiveRangesOverlap,
	isEffectiveOnDate,
} from "../../shared/effective-date";
import { mapConflict, mapNotFound } from "../../shared/persistence-errors";
import type { PayrollSetupStore } from "../../store/setup";
import type {
	IdempotentPayrollCalendarRecord,
	PayrollCalendar,
	PayrollCalendarCreateRecord,
	PayrollCalendarUpdateInput,
	PayrollDeductionRule,
	PayrollDeductionRuleCreateRecord,
	PayrollEarningRule,
	PayrollEarningRuleCreateRecord,
	PayrollPayGroup,
	PayrollPayGroupCreateRecord,
	PayrollPeriod,
	PayrollPeriodCreateRecord,
	PayrollStatutoryRule,
	PayrollStatutoryRuleCreateRecord,
} from "../../types";
import {
	type IdempotentEntityRecord,
	idempotencyMapKey,
	type SetupMemoryState,
} from "./state";
import { createMemorySetupExtendedMethods } from "./setup-extended-methods";

function cloneCalendar(calendar: PayrollCalendar): PayrollCalendar {
	return { ...calendar };
}

function clonePayGroup(payGroup: PayrollPayGroup): PayrollPayGroup {
	return { ...payGroup };
}

function clonePeriod(period: PayrollPeriod): PayrollPeriod {
	return { ...period };
}

function cloneEarningRule(rule: PayrollEarningRule): PayrollEarningRule {
	return { ...rule };
}

function cloneDeductionRule(rule: PayrollDeductionRule): PayrollDeductionRule {
	return { ...rule };
}

function cloneStatutoryRule(rule: PayrollStatutoryRule): PayrollStatutoryRule {
	return { ...rule };
}

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

function resolveIdempotentReplay<TEntity>(
	existing: IdempotentEntityRecord<TEntity> | undefined,
	createRequestFingerprint: string,
	clone: (entity: TEntity) => TEntity,
): Result<TEntity | null> {
	if (existing === undefined) {
		return ok(null);
	}
	if (existing.createRequestFingerprint !== createRequestFingerprint) {
		return mapConflict("Idempotency key conflict");
	}
	return ok(clone(existing.entity));
}

function hasActiveRuleOverlap<
	TRule extends {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		status: "active" | "superseded" | "archived";
		effectiveFrom: string;
		effectiveTo: string | null;
	},
>(
	rules: Iterable<TRule>,
	record: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveFrom: string;
		effectiveTo: string | null;
	},
): boolean {
	for (const rule of rules) {
		if (
			rule.organizationId !== record.organizationId ||
			rule.payGroupId !== record.payGroupId ||
			rule.code !== record.code ||
			rule.status !== "active"
		) {
			continue;
		}
		if (
			effectiveRangesOverlap(
				rule.effectiveFrom,
				rule.effectiveTo,
				record.effectiveFrom,
				record.effectiveTo,
			)
		) {
			return true;
		}
	}
	return false;
}

function selectRuleAtEffectiveDate<
	TRule extends {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		status: "active" | "superseded" | "archived";
		effectiveFrom: string;
		effectiveTo: string | null;
	},
>(
	rules: Iterable<TRule>,
	input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveDate: string;
	},
): TRule | null {
	let selected: TRule | null = null;
	for (const rule of rules) {
		if (
			rule.organizationId !== input.organizationId ||
			rule.payGroupId !== input.payGroupId ||
			rule.code !== input.code ||
			rule.status !== "active"
		) {
			continue;
		}
		if (
			!isEffectiveOnDate(
				rule.effectiveFrom,
				rule.effectiveTo,
				input.effectiveDate,
			)
		) {
			continue;
		}
		if (selected === null || rule.effectiveFrom > selected.effectiveFrom) {
			selected = rule;
		}
	}
	return selected;
}

function listActiveRulesForPayGroup<
	TRule extends {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		status: "active" | "superseded" | "archived";
		effectiveFrom: string;
		effectiveTo: string | null;
	},
>(
	rules: Iterable<TRule>,
	input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	},
): TRule[] {
	const selected: TRule[] = [];
	for (const rule of rules) {
		if (
			rule.organizationId !== input.organizationId ||
			rule.payGroupId !== input.payGroupId ||
			rule.status !== "active"
		) {
			continue;
		}
		if (
			!isEffectiveOnDate(
				rule.effectiveFrom,
				rule.effectiveTo,
				input.effectiveDate,
			)
		) {
			continue;
		}
		selected.push(rule);
	}
	return selected;
}

export function createMemorySetupMethods(
	state: SetupMemoryState,
): PayrollSetupStore {
	const coreMethods = {
		async findCalendarByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentPayrollCalendarRecord | null>> {
			const record = state.calendarIdempotency.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return ok(null);
			}
			return ok({
				calendar: cloneCalendar(record.calendar),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createCalendar(
			record: PayrollCalendarCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollCalendar>> {
			const existing = await this.findCalendarByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (
					existing.data.createRequestFingerprint !==
					record.createRequestFingerprint
				) {
					return mapConflict("Idempotency key conflict");
				}
				return ok(cloneCalendar(existing.data.calendar));
			}

			const idResult = parsePayrollCalendarId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const calendar: PayrollCalendar = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				timezone: record.timezone,
				status: "active",
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.calendars.set(calendar.id, calendar);
			state.calendarIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					calendar: cloneCalendar(calendar),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_calendar",
				entityId: calendar.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.calendars.delete(calendar.id);
				state.calendarIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				);
				return audit;
			}

			return ok(cloneCalendar(calendar));
		},

		async getCalendar(input: {
			organizationId: string;
			calendarId: PayrollCalendarId;
		}): Promise<Result<PayrollCalendar | null>> {
			const calendar = state.calendars.get(input.calendarId);
			if (
				calendar === undefined ||
				calendar.organizationId !== input.organizationId
			) {
				return ok(null);
			}
			return ok(cloneCalendar(calendar));
		},

		async updateCalendar(
			input: PayrollCalendarUpdateInput,
			ports: MutationPorts,
		): Promise<Result<PayrollCalendar>> {
			const calendar = state.calendars.get(input.calendarId);
			if (
				calendar === undefined ||
				calendar.organizationId !== input.organizationId
			) {
				return mapNotFound("Payroll calendar not found");
			}

			const versionCheck = assertExpectedVersion(
				calendar.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: PayrollCalendar = {
				...calendar,
				name: input.name ?? calendar.name,
				timezone: input.timezone ?? calendar.timezone,
				effectiveTo:
					input.effectiveTo !== undefined
						? input.effectiveTo
						: calendar.effectiveTo,
				version: calendar.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.calendars.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "payroll_calendar",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.calendars.set(calendar.id, calendar);
				return audit;
			}

			return ok(cloneCalendar(updated));
		},

		async createPayGroup(
			record: PayrollPayGroupCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollPayGroup>> {
			const replay = resolveIdempotentReplay(
				state.payGroupIdempotency.get(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				),
				record.createRequestFingerprint,
				clonePayGroup,
			);
			if (!replay.ok) {
				return replay;
			}
			if (replay.data !== null) {
				return ok(replay.data);
			}

			const calendar = state.calendars.get(record.calendarId);
			if (
				calendar === undefined ||
				calendar.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll calendar not found");
			}

			const idResult = parsePayrollPayGroupId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const payGroup: PayrollPayGroup = {
				id: idResult.data,
				organizationId: record.organizationId,
				calendarId: record.calendarId,
				code: record.code,
				name: record.name,
				currencyCode: record.currencyCode,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.payGroups.set(payGroup.id, payGroup);
			state.payGroupIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					entity: clonePayGroup(payGroup),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_pay_group",
				entityId: payGroup.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.payGroups.delete(payGroup.id);
				state.payGroupIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				);
				return audit;
			}

			return ok(clonePayGroup(payGroup));
		},

		async getPayGroup(input: {
			organizationId: string;
			payGroupId: PayrollPayGroupId;
		}): Promise<Result<PayrollPayGroup | null>> {
			const payGroup = state.payGroups.get(input.payGroupId);
			if (
				payGroup === undefined ||
				payGroup.organizationId !== input.organizationId
			) {
				return ok(null);
			}
			return ok(clonePayGroup(payGroup));
		},

		async listPayGroups(input: {
			organizationId: string;
			status?: "active" | "archived";
		}): Promise<Result<PayrollPayGroup[]>> {
			const groups = Array.from(state.payGroups.values()).filter((payGroup) => {
				if (payGroup.organizationId !== input.organizationId) {
					return false;
				}
				if (input.status !== undefined && payGroup.status !== input.status) {
					return false;
				}
				return true;
			});
			return ok(groups.map(clonePayGroup));
		},

		async createPeriod(
			record: PayrollPeriodCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollPeriod>> {
			const replay = resolveIdempotentReplay(
				state.periodIdempotency.get(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				),
				record.createRequestFingerprint,
				clonePeriod,
			);
			if (!replay.ok) {
				return replay;
			}
			if (replay.data !== null) {
				return ok(replay.data);
			}

			const payGroup = state.payGroups.get(record.payGroupId);
			if (
				payGroup === undefined ||
				payGroup.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll pay group not found");
			}

			const idResult = parsePayrollPeriodId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const period: PayrollPeriod = {
				id: idResult.data,
				organizationId: record.organizationId,
				payGroupId: record.payGroupId,
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
				cutoffDate: record.cutoffDate,
				status: "open",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.periods.set(period.id, period);
			state.periodIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					entity: clonePeriod(period),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_period",
				entityId: period.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.periods.delete(period.id);
				state.periodIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				);
				return audit;
			}

			return ok(clonePeriod(period));
		},

		async getPeriod(input: {
			organizationId: string;
			periodId: PayrollPeriodId;
		}): Promise<Result<PayrollPeriod | null>> {
			const period = state.periods.get(input.periodId);
			if (
				period === undefined ||
				period.organizationId !== input.organizationId
			) {
				return ok(null);
			}
			return ok(clonePeriod(period));
		},

		async listPeriodsForPayGroup(input: {
			organizationId: string;
			payGroupId: PayrollPayGroupId;
			status?: "open" | "closed";
		}): Promise<Result<PayrollPeriod[]>> {
			const periods = Array.from(state.periods.values()).filter((period) => {
				if (
					period.organizationId !== input.organizationId ||
					period.payGroupId !== input.payGroupId
				) {
					return false;
				}
				if (input.status !== undefined && period.status !== input.status) {
					return false;
				}
				return true;
			});
			return ok(periods.map(clonePeriod));
		},

		async createEarningRule(
			record: PayrollEarningRuleCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollEarningRule>> {
			const replay = resolveIdempotentReplay(
				state.earningRuleIdempotency.get(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				),
				record.createRequestFingerprint,
				cloneEarningRule,
			);
			if (!replay.ok) {
				return replay;
			}
			if (replay.data !== null) {
				return ok(replay.data);
			}

			const payGroup = state.payGroups.get(record.payGroupId);
			if (
				payGroup === undefined ||
				payGroup.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll pay group not found");
			}

			if (hasActiveRuleOverlap(state.earningRules.values(), record)) {
				return fail(
					"CONFLICT",
					"Overlapping effective range for active earning rule",
					payrollErrorDetails(PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP),
				);
			}

			const idResult = parsePayrollEarningRuleId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const rule: PayrollEarningRule = {
				id: idResult.data,
				organizationId: record.organizationId,
				payGroupId: record.payGroupId,
				code: record.code,
				name: record.name,
				ruleType: record.ruleType,
				amount: record.amount,
				rate: record.rate,
				currencyCode: record.currencyCode,
				ruleVersion: record.ruleVersion,
				status: "active",
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.earningRules.set(rule.id, rule);
			state.earningRuleIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					entity: cloneEarningRule(rule),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_earning_rule",
				entityId: rule.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.earningRules.delete(rule.id);
				state.earningRuleIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				);
				return audit;
			}

			return ok(cloneEarningRule(rule));
		},

		async createDeductionRule(
			record: PayrollDeductionRuleCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollDeductionRule>> {
			const replay = resolveIdempotentReplay(
				state.deductionRuleIdempotency.get(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				),
				record.createRequestFingerprint,
				cloneDeductionRule,
			);
			if (!replay.ok) {
				return replay;
			}
			if (replay.data !== null) {
				return ok(replay.data);
			}

			const payGroup = state.payGroups.get(record.payGroupId);
			if (
				payGroup === undefined ||
				payGroup.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll pay group not found");
			}

			if (hasActiveRuleOverlap(state.deductionRules.values(), record)) {
				return fail(
					"CONFLICT",
					"Overlapping effective range for active deduction rule",
					payrollErrorDetails(PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP),
				);
			}

			const idResult = parsePayrollDeductionRuleId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const rule: PayrollDeductionRule = {
				id: idResult.data,
				organizationId: record.organizationId,
				payGroupId: record.payGroupId,
				code: record.code,
				name: record.name,
				ruleType: record.ruleType,
				amount: record.amount,
				rate: record.rate,
				currencyCode: record.currencyCode,
				ruleVersion: record.ruleVersion,
				taxTiming: record.taxTiming,
				status: "active",
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.deductionRules.set(rule.id, rule);
			state.deductionRuleIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					entity: cloneDeductionRule(rule),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_deduction_rule",
				entityId: rule.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.deductionRules.delete(rule.id);
				state.deductionRuleIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				);
				return audit;
			}

			return ok(cloneDeductionRule(rule));
		},

		async createStatutoryRule(
			record: PayrollStatutoryRuleCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollStatutoryRule>> {
			const replay = resolveIdempotentReplay(
				state.statutoryRuleIdempotency.get(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				),
				record.createRequestFingerprint,
				cloneStatutoryRule,
			);
			if (!replay.ok) {
				return replay;
			}
			if (replay.data !== null) {
				return ok(replay.data);
			}

			const payGroup = state.payGroups.get(record.payGroupId);
			if (
				payGroup === undefined ||
				payGroup.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll pay group not found");
			}

			if (hasActiveRuleOverlap(state.statutoryRules.values(), record)) {
				return fail(
					"CONFLICT",
					"Overlapping effective range for active statutory rule",
					payrollErrorDetails(PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP),
				);
			}

			const idResult = parsePayrollStatutoryRuleId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const rule: PayrollStatutoryRule = {
				id: idResult.data,
				organizationId: record.organizationId,
				payGroupId: record.payGroupId,
				code: record.code,
				name: record.name,
				jurisdictionCode: record.jurisdictionCode,
				configJson: record.configJson,
				ruleVersion: record.ruleVersion,
				status: "active",
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.statutoryRules.set(rule.id, rule);
			state.statutoryRuleIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					entity: cloneStatutoryRule(rule),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_statutory_rule",
				entityId: rule.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.statutoryRules.delete(rule.id);
				state.statutoryRuleIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
				);
				return audit;
			}

			return ok(cloneStatutoryRule(rule));
		},

		async getEarningRuleAtEffectiveDate(input: {
			organizationId: string;
			payGroupId: PayrollPayGroupId;
			code: string;
			effectiveDate: string;
		}): Promise<Result<PayrollEarningRule | null>> {
			const rule = selectRuleAtEffectiveDate(
				state.earningRules.values(),
				input,
			);
			return ok(rule === null ? null : cloneEarningRule(rule));
		},

		async getDeductionRuleAtEffectiveDate(input: {
			organizationId: string;
			payGroupId: PayrollPayGroupId;
			code: string;
			effectiveDate: string;
		}): Promise<Result<PayrollDeductionRule | null>> {
			const rule = selectRuleAtEffectiveDate(
				state.deductionRules.values(),
				input,
			);
			return ok(rule === null ? null : cloneDeductionRule(rule));
		},

		async getStatutoryRuleAtEffectiveDate(input: {
			organizationId: string;
			payGroupId: PayrollPayGroupId;
			code: string;
			effectiveDate: string;
		}): Promise<Result<PayrollStatutoryRule | null>> {
			const rule = selectRuleAtEffectiveDate(
				state.statutoryRules.values(),
				input,
			);
			return ok(rule === null ? null : cloneStatutoryRule(rule));
		},

		async listActiveEarningRulesForPayGroup(input: {
			organizationId: string;
			payGroupId: PayrollPayGroupId;
			effectiveDate: string;
		}): Promise<Result<PayrollEarningRule[]>> {
			const rules = listActiveRulesForPayGroup(
				state.earningRules.values(),
				input,
			).map(cloneEarningRule);
			return ok(rules);
		},

		async listActiveDeductionRulesForPayGroup(input: {
			organizationId: string;
			payGroupId: PayrollPayGroupId;
			effectiveDate: string;
		}): Promise<Result<PayrollDeductionRule[]>> {
			const rules = listActiveRulesForPayGroup(
				state.deductionRules.values(),
				input,
			).map(cloneDeductionRule);
			return ok(rules);
		},

		async listActiveStatutoryRulesForPayGroup(input: {
			organizationId: string;
			payGroupId: PayrollPayGroupId;
			effectiveDate: string;
		}): Promise<Result<PayrollStatutoryRule[]>> {
			const rules = listActiveRulesForPayGroup(
				state.statutoryRules.values(),
				input,
			).map(cloneStatutoryRule);
			return ok(rules);
		},
	};

	const extendedMethods = createMemorySetupExtendedMethods({
		state,
		recordAudit,
		cloneCalendar,
		clonePayGroup,
		clonePeriod,
		cloneEarningRule,
		cloneDeductionRule,
		cloneStatutoryRule,
		host: coreMethods as PayrollSetupStore,
	});

	return {
		...coreMethods,
		...extendedMethods,
	} as PayrollSetupStore;
}
