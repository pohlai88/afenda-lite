import type { Result } from "@afenda/errors/result";

import type {
	PayrollCalendarId,
	PayrollDeductionRuleId,
	PayrollEarningRuleId,
	PayrollPayGroupId,
	PayrollPeriodId,
	PayrollStatutoryRuleId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type {
	PayrollRuleFinalizedUsageCheck,
	PayrollRuleFinalizedUsageInput,
} from "../shared/rule-finalized-lock";
import type {
	IdempotentPayrollCalendarRecord,
	PayrollCalendar,
	PayrollCalendarArchiveInput,
	PayrollCalendarCreateRecord,
	PayrollCalendarUpdateInput,
	PayrollDeductionRule,
	PayrollDeductionRuleArchiveInput,
	PayrollDeductionRuleCreateRecord,
	PayrollDeductionRuleSupersedeRecord,
	PayrollDeductionRuleUpdateInput,
	PayrollEarningRule,
	PayrollEarningRuleArchiveInput,
	PayrollEarningRuleCreateRecord,
	PayrollEarningRuleSupersedeRecord,
	PayrollEarningRuleUpdateInput,
	PayrollPayGroup,
	PayrollPayGroupArchiveInput,
	PayrollPayGroupCreateRecord,
	PayrollPayGroupUpdateInput,
	PayrollPeriod,
	PayrollPeriodCloseInput,
	PayrollPeriodCreateRecord,
	PayrollPeriodUpdateInput,
	PayrollStatutoryRule,
	PayrollStatutoryRuleArchiveInput,
	PayrollStatutoryRuleCreateRecord,
	PayrollStatutoryRuleSupersedeRecord,
	PayrollStatutoryRuleUpdateInput,
	PayrollRuleSupersedeResult,
} from "../types";

/**
 * Persistence contract for setup — calendar, pay group, period, rules.
 * Slice of `PayrollStore`. Persistence only; orchestration stays in commands.
 */
export type PayrollSetupStore = {
	findCalendarByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPayrollCalendarRecord | null>>;

	createCalendar(
		input: PayrollCalendarCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollCalendar>>;

	getCalendar(input: {
		organizationId: string;
		calendarId: PayrollCalendarId;
	}): Promise<Result<PayrollCalendar | null>>;

	listCalendars(input: {
		organizationId: string;
		status?: "active" | "archived";
	}): Promise<Result<PayrollCalendar[]>>;

	updateCalendar(
		input: PayrollCalendarUpdateInput,
		ports: MutationPorts,
	): Promise<Result<PayrollCalendar>>;

	archiveCalendar(
		input: PayrollCalendarArchiveInput,
		ports: MutationPorts,
	): Promise<Result<PayrollCalendar>>;

	createPayGroup(
		input: PayrollPayGroupCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollPayGroup>>;

	getPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
	}): Promise<Result<PayrollPayGroup | null>>;

	listPayGroups(input: {
		organizationId: string;
		status?: "active" | "archived";
	}): Promise<Result<PayrollPayGroup[]>>;

	updatePayGroup(
		input: PayrollPayGroupUpdateInput,
		ports: MutationPorts,
	): Promise<Result<PayrollPayGroup>>;

	archivePayGroup(
		input: PayrollPayGroupArchiveInput,
		ports: MutationPorts,
	): Promise<Result<PayrollPayGroup>>;

	createPeriod(
		input: PayrollPeriodCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollPeriod>>;

	getPeriod(input: {
		organizationId: string;
		periodId: PayrollPeriodId;
	}): Promise<Result<PayrollPeriod | null>>;

	listPeriodsForPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		status?: "open" | "closed";
	}): Promise<Result<PayrollPeriod[]>>;

	updatePeriod(
		input: PayrollPeriodUpdateInput,
		ports: MutationPorts,
	): Promise<Result<PayrollPeriod>>;

	closePeriod(
		input: PayrollPeriodCloseInput,
		ports: MutationPorts,
	): Promise<Result<PayrollPeriod>>;

	createEarningRule(
		input: PayrollEarningRuleCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollEarningRule>>;

	getEarningRule(input: {
		organizationId: string;
		ruleId: PayrollEarningRuleId;
	}): Promise<Result<PayrollEarningRule | null>>;

	updateEarningRule(
		input: PayrollEarningRuleUpdateInput,
		ports: MutationPorts,
	): Promise<Result<PayrollEarningRule>>;

	archiveEarningRule(
		input: PayrollEarningRuleArchiveInput,
		ports: MutationPorts,
	): Promise<Result<PayrollEarningRule>>;

	supersedeEarningRule(
		input: PayrollEarningRuleSupersedeRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollRuleSupersedeResult<PayrollEarningRule>>>;

	createDeductionRule(
		input: PayrollDeductionRuleCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollDeductionRule>>;

	getDeductionRule(input: {
		organizationId: string;
		ruleId: PayrollDeductionRuleId;
	}): Promise<Result<PayrollDeductionRule | null>>;

	updateDeductionRule(
		input: PayrollDeductionRuleUpdateInput,
		ports: MutationPorts,
	): Promise<Result<PayrollDeductionRule>>;

	archiveDeductionRule(
		input: PayrollDeductionRuleArchiveInput,
		ports: MutationPorts,
	): Promise<Result<PayrollDeductionRule>>;

	supersedeDeductionRule(
		input: PayrollDeductionRuleSupersedeRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollRuleSupersedeResult<PayrollDeductionRule>>>;

	createStatutoryRule(
		input: PayrollStatutoryRuleCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollStatutoryRule>>;

	getStatutoryRule(input: {
		organizationId: string;
		ruleId: PayrollStatutoryRuleId;
	}): Promise<Result<PayrollStatutoryRule | null>>;

	updateStatutoryRule(
		input: PayrollStatutoryRuleUpdateInput,
		ports: MutationPorts,
	): Promise<Result<PayrollStatutoryRule>>;

	archiveStatutoryRule(
		input: PayrollStatutoryRuleArchiveInput,
		ports: MutationPorts,
	): Promise<Result<PayrollStatutoryRule>>;

	supersedeStatutoryRule(
		input: PayrollStatutoryRuleSupersedeRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollRuleSupersedeResult<PayrollStatutoryRule>>>;

	getEarningRuleAtEffectiveDate(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveDate: string;
	}): Promise<Result<PayrollEarningRule | null>>;

	getDeductionRuleAtEffectiveDate(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveDate: string;
	}): Promise<Result<PayrollDeductionRule | null>>;

	getStatutoryRuleAtEffectiveDate(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveDate: string;
	}): Promise<Result<PayrollStatutoryRule | null>>;

	recordRuleVersionUsedByFinalizedRun(
		input: PayrollRuleFinalizedUsageInput,
	): Promise<Result<{ recorded: true }>>;

	isRuleVersionUsedByFinalizedRun(
		input: PayrollRuleFinalizedUsageCheck,
	): Promise<Result<boolean>>;

	listActiveEarningRulesForPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}): Promise<Result<PayrollEarningRule[]>>;

	listActiveDeductionRulesForPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}): Promise<Result<PayrollDeductionRule[]>>;

	listActiveStatutoryRulesForPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}): Promise<Result<PayrollStatutoryRule[]>>;
};

export type {
	PayrollCalendarCreateRecord,
	PayrollPayGroupCreateRecord,
	PayrollPeriodCreateRecord,
	PayrollEarningRuleCreateRecord,
	PayrollDeductionRuleCreateRecord,
	PayrollStatutoryRuleCreateRecord,
	PayrollCalendarUpdateInput,
	PayrollCalendarArchiveInput,
	PayrollPayGroupUpdateInput,
	PayrollPayGroupArchiveInput,
	PayrollPeriodUpdateInput,
	PayrollPeriodCloseInput,
	PayrollEarningRuleUpdateInput,
	PayrollEarningRuleArchiveInput,
	PayrollEarningRuleSupersedeRecord,
	PayrollDeductionRuleUpdateInput,
	PayrollDeductionRuleArchiveInput,
	PayrollDeductionRuleSupersedeRecord,
	PayrollStatutoryRuleUpdateInput,
	PayrollStatutoryRuleArchiveInput,
	PayrollStatutoryRuleSupersedeRecord,
} from "../types";

export type {
	PayrollCalendarId,
	PayrollDeductionRuleId,
	PayrollEarningRuleId,
	PayrollPayGroupId,
	PayrollPeriodId,
	PayrollStatutoryRuleId,
} from "../brands";
