// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous payroll setup ports.
import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
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
} from "../../kernel/contracts/projected-types";
import { assertExpectedVersion } from "../../kernel/execution/concurrency";
import {
	mapConflict,
	mapNotFound,
} from "../../kernel/execution/persistence-errors";
import type { MutationPorts } from "../../kernel/execution/ports";
import { recordPayrollAudit as recordAudit } from "../../kernel/execution/record-audit";
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
	parsePayrollStatutoryRuleId,
} from "../../kernel/identity/brands";
import {
	type IdempotentEntityRecord,
	idempotencyMapKey,
} from "../../kernel/identity/source-idempotency";
import {
	effectiveRangesOverlap,
	isEffectiveOnDate,
	isValidEffectiveDateRange,
} from "../../kernel/temporal/effective-date";
import type { PayrollSetupStore } from "./setup.store";
import { createMemorySetupExtendedMethods } from "./setup-extended.memory";
import {
	assertValidPayrollAmountRateRuleConfiguration,
	isHistoricallyApplicableRuleStatus,
} from "./setup-rule-policy";

export interface SetupMemoryState {
	calendarIdempotency: Map<string, IdempotentPayrollCalendarRecord>;
	calendars: Map<PayrollCalendarId, PayrollCalendar>;
	deductionRuleIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollDeductionRule>
	>;
	deductionRules: Map<PayrollDeductionRuleId, PayrollDeductionRule>;
	earningRuleIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollEarningRule>
	>;
	earningRules: Map<PayrollEarningRuleId, PayrollEarningRule>;
	payGroupIdempotency: Map<string, IdempotentEntityRecord<PayrollPayGroup>>;
	payGroups: Map<PayrollPayGroupId, PayrollPayGroup>;
	periodIdempotency: Map<string, IdempotentEntityRecord<PayrollPeriod>>;
	periods: Map<PayrollPeriodId, PayrollPeriod>;
	ruleFinalizedUsage: Set<string>;
	statutoryRuleIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollStatutoryRule>
	>;
	statutoryRules: Map<PayrollStatutoryRuleId, PayrollStatutoryRule>;
}

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

function resolveIdempotentReplay<TEntity>(
	existing: IdempotentEntityRecord<TEntity> | undefined,
	createRequestFingerprint: string,
	clone: (entity: TEntity) => TEntity,
): Result<TEntity | null> {
	if (existing === undefined) {
		return errorResult.ok(null);
	}
	if (existing.createRequestFingerprint !== createRequestFingerprint) {
		return mapConflict("Idempotency key conflict");
	}
	return errorResult.ok(clone(existing.entity));
}

function hasRuleHistoryOverlap<
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
			!isHistoricallyApplicableRuleStatus(rule.status)
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
			!isHistoricallyApplicableRuleStatus(rule.status)
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
			!isHistoricallyApplicableRuleStatus(rule.status)
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
				return errorResult.ok(null);
			}
			return errorResult.ok({
				calendar: cloneCalendar(record.calendar),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createCalendar(
			record: PayrollCalendarCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollCalendar>> {
			if (!isValidEffectiveDateRange(record)) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "effectiveTo must be on or after effectiveFrom",
				});
			}
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
				return errorResult.ok(cloneCalendar(existing.data.calendar));
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

			return errorResult.ok(cloneCalendar(calendar));
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
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneCalendar(calendar));
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
			const effectiveTo =
				input.effectiveTo === undefined
					? calendar.effectiveTo
					: input.effectiveTo;
			if (
				!isValidEffectiveDateRange({
					effectiveFrom: calendar.effectiveFrom,
					effectiveTo,
				})
			) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "effectiveTo must be on or after effectiveFrom",
				});
			}

			const now = new Date();
			const updated: PayrollCalendar = {
				...calendar,
				name: input.name ?? calendar.name,
				timezone: input.timezone ?? calendar.timezone,
				effectiveTo,
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

			return errorResult.ok(cloneCalendar(updated));
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
				return errorResult.ok(replay.data);
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

			return errorResult.ok(clonePayGroup(payGroup));
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
				return errorResult.ok(null);
			}
			return errorResult.ok(clonePayGroup(payGroup));
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
			return errorResult.ok(groups.map(clonePayGroup));
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
				return errorResult.ok(replay.data);
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

			return errorResult.ok(clonePeriod(period));
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
				return errorResult.ok(null);
			}
			return errorResult.ok(clonePeriod(period));
		},

		async listPeriodsForOrganization(input: {
			organizationId: string;
		}): Promise<Result<PayrollPeriod[]>> {
			const periods = Array.from(state.periods.values()).filter(
				(period) => period.organizationId === input.organizationId,
			);
			return errorResult.ok(periods.map(clonePeriod));
		},

		async listPeriodsForPayGroup(input: {
			organizationId: string;
			payGroupId: PayrollPayGroupId;
			status?: PayrollPeriod["status"];
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
			return errorResult.ok(periods.map(clonePeriod));
		},

		async createEarningRule(
			record: PayrollEarningRuleCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollEarningRule>> {
			if (!isValidEffectiveDateRange(record)) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "effectiveTo must be on or after effectiveFrom",
				});
			}
			const configuration =
				assertValidPayrollAmountRateRuleConfiguration(record);
			if (!configuration.ok) {
				return configuration;
			}
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
				return errorResult.ok(replay.data);
			}

			const payGroup = state.payGroups.get(record.payGroupId);
			if (
				payGroup === undefined ||
				payGroup.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll pay group not found");
			}

			if (hasRuleHistoryOverlap(state.earningRules.values(), record)) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Overlapping effective range for non-archived earning rule",
				});
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

			return errorResult.ok(cloneEarningRule(rule));
		},

		async createDeductionRule(
			record: PayrollDeductionRuleCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollDeductionRule>> {
			if (!isValidEffectiveDateRange(record)) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "effectiveTo must be on or after effectiveFrom",
				});
			}
			const configuration =
				assertValidPayrollAmountRateRuleConfiguration(record);
			if (!configuration.ok) {
				return configuration;
			}
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
				return errorResult.ok(replay.data);
			}

			const payGroup = state.payGroups.get(record.payGroupId);
			if (
				payGroup === undefined ||
				payGroup.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll pay group not found");
			}

			if (hasRuleHistoryOverlap(state.deductionRules.values(), record)) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Overlapping effective range for non-archived deduction rule",
				});
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

			return errorResult.ok(cloneDeductionRule(rule));
		},

		async createStatutoryRule(
			record: PayrollStatutoryRuleCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollStatutoryRule>> {
			if (!isValidEffectiveDateRange(record)) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "effectiveTo must be on or after effectiveFrom",
				});
			}
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
				return errorResult.ok(replay.data);
			}

			const payGroup = state.payGroups.get(record.payGroupId);
			if (
				payGroup === undefined ||
				payGroup.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll pay group not found");
			}

			if (hasRuleHistoryOverlap(state.statutoryRules.values(), record)) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Overlapping effective range for non-archived statutory rule",
				});
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

			return errorResult.ok(cloneStatutoryRule(rule));
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
			return errorResult.ok(rule === null ? null : cloneEarningRule(rule));
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
			return errorResult.ok(rule === null ? null : cloneDeductionRule(rule));
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
			return errorResult.ok(rule === null ? null : cloneStatutoryRule(rule));
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
			return errorResult.ok(rules);
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
			return errorResult.ok(rules);
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
			return errorResult.ok(rules);
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
