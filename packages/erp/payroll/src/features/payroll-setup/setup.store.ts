import type { Result } from "@afenda/errors";
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
	PayrollPeriodLockInput,
	PayrollPeriodUpdateInput,
	PayrollRuleSupersedeResult,
	PayrollStatutoryRule,
	PayrollStatutoryRuleArchiveInput,
	PayrollStatutoryRuleCreateRecord,
	PayrollStatutoryRuleSupersedeRecord,
	PayrollStatutoryRuleUpdateInput,
} from "../../kernel/contracts/projected-types";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	PayrollCalendarId,
	PayrollDeductionRuleId,
	PayrollEarningRuleId,
	PayrollPayGroupId,
	PayrollPeriodId,
	PayrollStatutoryRuleId,
} from "../../kernel/identity/brands";
import type {
	PayrollRuleFinalizedUsageCheck,
	PayrollRuleFinalizedUsageInput,
} from "./rule-finalized-lock";

/**
 * Persistence contract for setup — calendar, pay group, period, rules.
 * Persistence only; orchestration stays in Payroll setup operations.
 */
export interface PayrollSetupStore {
	archiveCalendar: (
		input: PayrollCalendarArchiveInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollCalendar>>;

	archiveDeductionRule: (
		input: PayrollDeductionRuleArchiveInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollDeductionRule>>;

	archiveEarningRule: (
		input: PayrollEarningRuleArchiveInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollEarningRule>>;

	archivePayGroup: (
		input: PayrollPayGroupArchiveInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollPayGroup>>;

	archiveStatutoryRule: (
		input: PayrollStatutoryRuleArchiveInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollStatutoryRule>>;

	closePeriod: (
		input: PayrollPeriodCloseInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollPeriod>>;

	createCalendar: (
		input: PayrollCalendarCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollCalendar>>;

	createDeductionRule: (
		input: PayrollDeductionRuleCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollDeductionRule>>;

	createEarningRule: (
		input: PayrollEarningRuleCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollEarningRule>>;

	createPayGroup: (
		input: PayrollPayGroupCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollPayGroup>>;

	createPeriod: (
		input: PayrollPeriodCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollPeriod>>;

	createStatutoryRule: (
		input: PayrollStatutoryRuleCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollStatutoryRule>>;
	findCalendarByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentPayrollCalendarRecord | null>>;

	getCalendar: (input: {
		organizationId: string;
		calendarId: PayrollCalendarId;
	}) => Promise<Result<PayrollCalendar | null>>;

	getDeductionRule: (input: {
		organizationId: string;
		ruleId: PayrollDeductionRuleId;
	}) => Promise<Result<PayrollDeductionRule | null>>;

	getDeductionRuleAtEffectiveDate: (input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveDate: string;
	}) => Promise<Result<PayrollDeductionRule | null>>;

	getEarningRule: (input: {
		organizationId: string;
		ruleId: PayrollEarningRuleId;
	}) => Promise<Result<PayrollEarningRule | null>>;

	getEarningRuleAtEffectiveDate: (input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveDate: string;
	}) => Promise<Result<PayrollEarningRule | null>>;

	getPayGroup: (input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
	}) => Promise<Result<PayrollPayGroup | null>>;

	getPeriod: (input: {
		organizationId: string;
		periodId: PayrollPeriodId;
	}) => Promise<Result<PayrollPeriod | null>>;

	getStatutoryRule: (input: {
		organizationId: string;
		ruleId: PayrollStatutoryRuleId;
	}) => Promise<Result<PayrollStatutoryRule | null>>;

	getStatutoryRuleAtEffectiveDate: (input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveDate: string;
	}) => Promise<Result<PayrollStatutoryRule | null>>;

	isRuleVersionUsedByFinalizedRun: (
		input: PayrollRuleFinalizedUsageCheck,
	) => Promise<Result<boolean>>;

	listActiveDeductionRulesForPayGroup: (input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}) => Promise<Result<PayrollDeductionRule[]>>;

	listActiveEarningRulesForPayGroup: (input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}) => Promise<Result<PayrollEarningRule[]>>;

	listActiveStatutoryRulesForPayGroup: (input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}) => Promise<Result<PayrollStatutoryRule[]>>;

	listCalendars: (input: {
		organizationId: string;
		status?: "active" | "archived" | undefined;
	}) => Promise<Result<PayrollCalendar[]>>;

	listPayGroups: (input: {
		organizationId: string;
		status?: "active" | "archived" | undefined;
	}) => Promise<Result<PayrollPayGroup[]>>;

	listPeriodsForOrganization: (input: {
		organizationId: string;
	}) => Promise<Result<PayrollPeriod[]>>;

	listPeriodsForPayGroup: (input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		status?: PayrollPeriod["status"] | undefined;
	}) => Promise<Result<PayrollPeriod[]>>;

	lockPeriodInputs: (
		input: PayrollPeriodLockInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollPeriod>>;

	recordRuleVersionUsedByFinalizedRun: (
		input: PayrollRuleFinalizedUsageInput,
	) => Promise<Result<{ recorded: true }>>;

	supersedeDeductionRule: (
		input: PayrollDeductionRuleSupersedeRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollRuleSupersedeResult<PayrollDeductionRule>>>;

	supersedeEarningRule: (
		input: PayrollEarningRuleSupersedeRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollRuleSupersedeResult<PayrollEarningRule>>>;

	supersedeStatutoryRule: (
		input: PayrollStatutoryRuleSupersedeRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollRuleSupersedeResult<PayrollStatutoryRule>>>;

	updateCalendar: (
		input: PayrollCalendarUpdateInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollCalendar>>;

	updateDeductionRule: (
		input: PayrollDeductionRuleUpdateInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollDeductionRule>>;

	updateEarningRule: (
		input: PayrollEarningRuleUpdateInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollEarningRule>>;

	updatePayGroup: (
		input: PayrollPayGroupUpdateInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollPayGroup>>;

	updatePeriod: (
		input: PayrollPeriodUpdateInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollPeriod>>;

	updateStatutoryRule: (
		input: PayrollStatutoryRuleUpdateInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollStatutoryRule>>;
}

export type {
	PayrollCalendarArchiveInput,
	PayrollCalendarCreateRecord,
	PayrollCalendarUpdateInput,
	PayrollDeductionRuleArchiveInput,
	PayrollDeductionRuleCreateRecord,
	PayrollDeductionRuleSupersedeRecord,
	PayrollDeductionRuleUpdateInput,
	PayrollEarningRuleArchiveInput,
	PayrollEarningRuleCreateRecord,
	PayrollEarningRuleSupersedeRecord,
	PayrollEarningRuleUpdateInput,
	PayrollPayGroupArchiveInput,
	PayrollPayGroupCreateRecord,
	PayrollPayGroupUpdateInput,
	PayrollPeriodCloseInput,
	PayrollPeriodCreateRecord,
	PayrollPeriodLockInput,
	PayrollPeriodUpdateInput,
	PayrollStatutoryRuleArchiveInput,
	PayrollStatutoryRuleCreateRecord,
	PayrollStatutoryRuleSupersedeRecord,
	PayrollStatutoryRuleUpdateInput,
} from "../../kernel/contracts/projected-types";
export type {
	PayrollCalendarId,
	PayrollDeductionRuleId,
	PayrollEarningRuleId,
	PayrollPayGroupId,
	PayrollPeriodId,
	PayrollStatutoryRuleId,
} from "../../kernel/identity/brands";
